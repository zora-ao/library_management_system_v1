import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

from app.config import Config
from app.services.backup_envelope import (
    BackupManifest,
    EnvelopePolicy,
    HEADER_STRUCT,
    InvalidBackupError,
    MAGIC,
    TAG_BYTES,
    decrypt_backup,
    encrypt_backup,
)


PASSPHRASE = "a-correct-horse-battery-staple"


def manifest_for(dump_bytes: bytes) -> BackupManifest:
    return BackupManifest(
        format_version=1,
        application="pahina-library",
        created_at="2026-11-02T00:00:00Z",
        schema_revisions=("f6d7e8a9b0c1",),
        postgres_server_version="17.4",
        postgres_client_version="17.4",
        dump_sha256=hashlib.sha256(dump_bytes).hexdigest(),
        dump_bytes=len(dump_bytes),
        table_counts={"users": 2, "books": 3},
        active_admin_count=1,
    )


def write_authenticated_payload(path: Path, payload: bytes, policy: EnvelopePolicy):
    salt = b"s" * 16
    nonce = b"n" * 12
    key = Scrypt(
        salt=salt,
        length=32,
        n=policy.scrypt_n,
        r=policy.scrypt_r,
        p=policy.scrypt_p,
    ).derive(PASSPHRASE.encode())
    header = HEADER_STRUCT.pack(
        MAGIC,
        1,
        policy.scrypt_n,
        policy.scrypt_r,
        policy.scrypt_p,
        salt,
        nonce,
        len(payload),
    )
    encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    encryptor.authenticate_additional_data(header)
    ciphertext = encryptor.update(payload) + encryptor.finalize()
    path.write_bytes(header + ciphertext + encryptor.tag)


class BackupEnvelopeTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.dump_bytes = b"PGDMP" + bytes(range(256)) * 8
        self.dump_path = self.root / "database.dump"
        self.dump_path.write_bytes(self.dump_bytes)
        self.manifest = manifest_for(self.dump_bytes)
        self.policy = EnvelopePolicy(max_bytes=4 * 1024 * 1024)

    def tearDown(self):
        self.tempdir.cleanup()

    def encrypt(self, name="backup.pahina-backup"):
        output = self.root / name
        digest = encrypt_backup(
            self.manifest,
            self.dump_path,
            output,
            PASSPHRASE,
            self.policy,
        )
        return output, digest

    def test_round_trip_restores_manifest_and_dump_bytes(self):
        encrypted, file_digest = self.encrypt()
        restored = self.root / "restored.dump"

        result = decrypt_backup(
            encrypted, restored, PASSPHRASE, self.policy
        )

        self.assertEqual(result, self.manifest)
        self.assertEqual(restored.read_bytes(), self.dump_bytes)
        self.assertEqual(file_digest, hashlib.sha256(encrypted.read_bytes()).hexdigest())

    def test_same_input_uses_fresh_salt_and_nonce(self):
        first, _ = self.encrypt("first.pahina-backup")
        second, _ = self.encrypt("second.pahina-backup")

        self.assertNotEqual(first.read_bytes(), second.read_bytes())

    def test_encrypt_returns_digest_without_reopening_completed_output(self):
        output = self.root / "single-write.pahina-backup"

        def hash_input_only(path):
            path = Path(path)
            if path == output:
                self.fail("Completed encrypted output was reopened for hashing")
            return hashlib.sha256(path.read_bytes()).hexdigest()

        with patch(
            "app.services.backup_envelope._sha256_file",
            side_effect=hash_input_only,
        ):
            digest = encrypt_backup(
                self.manifest,
                self.dump_path,
                output,
                PASSPHRASE,
                self.policy,
            )

        self.assertEqual(digest, hashlib.sha256(output.read_bytes()).hexdigest())

    def test_encrypt_rejects_dump_that_does_not_match_manifest(self):
        self.dump_path.write_bytes(self.dump_bytes + b"changed")
        output = self.root / "mismatch.pahina-backup"

        with self.assertRaisesRegex(ValueError, "Dump does not match its manifest"):
            encrypt_backup(
                self.manifest,
                self.dump_path,
                output,
                PASSPHRASE,
                self.policy,
            )

        self.assertFalse(output.exists())

    def test_wrong_passphrase_and_tampering_have_same_public_error(self):
        encrypted, _ = self.encrypt()

        with self.assertRaisesRegex(InvalidBackupError, "Invalid backup or passphrase"):
            decrypt_backup(
                encrypted,
                self.root / "wrong.dump",
                "this-passphrase-is-wrong",
                self.policy,
            )

        tampered = bytearray(encrypted.read_bytes())
        tampered[-TAG_BYTES - 2] ^= 1
        encrypted.write_bytes(tampered)
        with self.assertRaisesRegex(InvalidBackupError, "Invalid backup or passphrase"):
            decrypt_backup(
                encrypted,
                self.root / "tampered.dump",
                PASSPHRASE,
                self.policy,
            )

    def test_invalid_magic_version_and_truncated_tag_are_rejected(self):
        encrypted, _ = self.encrypt()
        original = encrypted.read_bytes()

        candidates = [
            b"X" + original[1:],
            original[: len(MAGIC)] + b"\x02" + original[len(MAGIC) + 1 :],
            original[:-TAG_BYTES],
        ]
        for index, candidate in enumerate(candidates):
            path = self.root / f"invalid-{index}.pahina-backup"
            path.write_bytes(candidate)
            with self.subTest(index=index), self.assertRaises(InvalidBackupError):
                decrypt_backup(path, self.root / f"invalid-{index}.dump", PASSPHRASE, self.policy)

    def test_passphrase_and_total_size_bounds_are_enforced(self):
        for passphrase in ("x" * 11, "x" * 1025):
            with self.subTest(length=len(passphrase)), self.assertRaisesRegex(
                ValueError, "12 to 1024"
            ):
                encrypt_backup(
                    self.manifest,
                    self.dump_path,
                    self.root / f"bad-{len(passphrase)}.backup",
                    passphrase,
                    self.policy,
                )

        tiny_policy = EnvelopePolicy(max_bytes=128)
        with self.assertRaisesRegex(ValueError, "maximum size"):
            encrypt_backup(
                self.manifest,
                self.dump_path,
                self.root / "oversized.backup",
                PASSPHRASE,
                tiny_policy,
            )

    def test_hostile_scrypt_and_record_lengths_are_rejected_before_allocation(self):
        encrypted, _ = self.encrypt()
        hostile_header = bytearray(encrypted.read_bytes())
        struct.pack_into(">I", hostile_header, len(MAGIC) + 1, 2**31)
        encrypted.write_bytes(hostile_header)
        with self.assertRaises(InvalidBackupError):
            decrypt_backup(encrypted, self.root / "hostile-kdf.dump", PASSPHRASE, self.policy)

        payload = struct.pack(">I", self.policy.max_manifest_bytes + 1)
        malicious = self.root / "hostile-length.backup"
        write_authenticated_payload(malicious, payload, self.policy)
        with self.assertRaises(InvalidBackupError):
            decrypt_backup(malicious, self.root / "hostile-length.dump", PASSPHRASE, self.policy)

    def test_trailing_plaintext_record_is_rejected(self):
        manifest_json = json.dumps(
            self.manifest.to_dict(), sort_keys=True, separators=(",", ":")
        ).encode()
        payload = (
            struct.pack(">I", len(manifest_json))
            + manifest_json
            + struct.pack(">Q", len(self.dump_bytes))
            + self.dump_bytes
            + b"unexpected"
        )
        encrypted = self.root / "trailing.backup"
        write_authenticated_payload(encrypted, payload, self.policy)

        with self.assertRaises(InvalidBackupError):
            decrypt_backup(encrypted, self.root / "trailing.dump", PASSPHRASE, self.policy)

    def test_config_exposes_version_one_envelope_defaults(self):
        self.assertEqual(Config.BACKUP_SCRYPT_N, 32768)
        self.assertEqual(Config.BACKUP_SCRYPT_R, 8)
        self.assertEqual(Config.BACKUP_SCRYPT_P, 1)


if __name__ == "__main__":
    unittest.main()
