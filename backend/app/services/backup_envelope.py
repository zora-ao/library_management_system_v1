from dataclasses import asdict, dataclass
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import tempfile

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt


MAGIC = b"PAHINA_BACKUP\x00"
FORMAT_VERSION = 1
TAG_BYTES = 16
SALT_BYTES = 16
NONCE_BYTES = 12
CHUNK_BYTES = 1024 * 1024
HEADER_STRUCT = struct.Struct(">14sBIII16s12sQ")
UINT32 = struct.Struct(">I")
UINT64 = struct.Struct(">Q")


class InvalidBackupError(ValueError):
  pass


@dataclass(frozen=True)
class EnvelopePolicy:
  max_bytes: int = 262_144_000
  max_manifest_bytes: int = 1024 * 1024
  scrypt_n: int = 32768
  scrypt_r: int = 8
  scrypt_p: int = 1


@dataclass(frozen=True)
class BackupManifest:
  format_version: int
  application: str
  created_at: str
  schema_revisions: tuple[str, ...]
  postgres_server_version: str
  postgres_client_version: str
  dump_sha256: str
  dump_bytes: int
  table_counts: dict[str, int]
  active_admin_count: int

  def to_dict(self) -> dict:
    data = asdict(self)
    data["schema_revisions"] = list(self.schema_revisions)
    return data

  @classmethod
  def from_dict(cls, data: dict) -> "BackupManifest":
    expected = {
      "format_version",
      "application",
      "created_at",
      "schema_revisions",
      "postgres_server_version",
      "postgres_client_version",
      "dump_sha256",
      "dump_bytes",
      "table_counts",
      "active_admin_count",
    }
    if not isinstance(data, dict) or set(data) != expected:
      raise ValueError("Invalid manifest fields")
    if data["format_version"] != FORMAT_VERSION:
      raise ValueError("Unsupported manifest version")
    string_fields = (
      "application",
      "created_at",
      "postgres_server_version",
      "postgres_client_version",
      "dump_sha256",
    )
    if any(not isinstance(data[field], str) or not data[field] for field in string_fields):
      raise ValueError("Invalid manifest strings")
    revisions = data["schema_revisions"]
    if not isinstance(revisions, list) or any(not isinstance(item, str) for item in revisions):
      raise ValueError("Invalid schema revisions")
    counts = data["table_counts"]
    if not isinstance(counts, dict) or any(
      not isinstance(name, str)
      or isinstance(count, bool)
      or not isinstance(count, int)
      or count < 0
      for name, count in counts.items()
    ):
      raise ValueError("Invalid table counts")
    for integer_field in ("dump_bytes", "active_admin_count"):
      value = data[integer_field]
      if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError("Invalid manifest integer")
    digest = data["dump_sha256"]
    if len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
      raise ValueError("Invalid dump digest")
    return cls(
      format_version=FORMAT_VERSION,
      application=data["application"],
      created_at=data["created_at"],
      schema_revisions=tuple(revisions),
      postgres_server_version=data["postgres_server_version"],
      postgres_client_version=data["postgres_client_version"],
      dump_sha256=digest,
      dump_bytes=data["dump_bytes"],
      table_counts=dict(counts),
      active_admin_count=data["active_admin_count"],
    )


def _validate_passphrase(passphrase: str) -> bytes:
  if not isinstance(passphrase, str) or not 12 <= len(passphrase) <= 1024:
    raise ValueError("Passphrase must be 12 to 1024 characters")
  return passphrase.encode("utf-8")


def _derive_key(passphrase: bytes, salt: bytes, policy: EnvelopePolicy) -> bytes:
  return Scrypt(
    salt=salt,
    length=32,
    n=policy.scrypt_n,
    r=policy.scrypt_r,
    p=policy.scrypt_p,
  ).derive(passphrase)


def _sha256_file(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as handle:
    for chunk in iter(lambda: handle.read(CHUNK_BYTES), b""):
      digest.update(chunk)
  return digest.hexdigest()


def encrypt_backup(
  manifest: BackupManifest,
  dump_path: Path,
  output_path: Path,
  passphrase: str,
  policy: EnvelopePolicy,
) -> str:
  encoded_passphrase = _validate_passphrase(passphrase)
  dump_path = Path(dump_path)
  output_path = Path(output_path)
  dump_size = dump_path.stat().st_size
  if dump_size != manifest.dump_bytes or _sha256_file(dump_path) != manifest.dump_sha256:
    raise ValueError("Dump does not match its manifest")

  manifest_bytes = json.dumps(
    manifest.to_dict(),
    sort_keys=True,
    separators=(",", ":"),
  ).encode("utf-8")
  if len(manifest_bytes) > policy.max_manifest_bytes:
    raise ValueError("Backup manifest exceeds maximum size")

  plaintext_bytes = UINT32.size + len(manifest_bytes) + UINT64.size + dump_size
  total_bytes = HEADER_STRUCT.size + plaintext_bytes + TAG_BYTES
  if total_bytes > policy.max_bytes:
    raise ValueError("Backup exceeds maximum size")

  salt = os.urandom(SALT_BYTES)
  nonce = os.urandom(NONCE_BYTES)
  key = _derive_key(encoded_passphrase, salt, policy)
  header = HEADER_STRUCT.pack(
    MAGIC,
    FORMAT_VERSION,
    policy.scrypt_n,
    policy.scrypt_r,
    policy.scrypt_p,
    salt,
    nonce,
    plaintext_bytes,
  )
  encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
  encryptor.authenticate_additional_data(header)

  try:
    with output_path.open("wb") as output, dump_path.open("rb") as dump:
      output.write(header)
      output.write(encryptor.update(UINT32.pack(len(manifest_bytes))))
      output.write(encryptor.update(manifest_bytes))
      output.write(encryptor.update(UINT64.pack(dump_size)))
      for chunk in iter(lambda: dump.read(CHUNK_BYTES), b""):
        output.write(encryptor.update(chunk))
      output.write(encryptor.finalize())
      output.write(encryptor.tag)
  except Exception:
    output_path.unlink(missing_ok=True)
    raise

  return _sha256_file(output_path)


def _raise_invalid(exc: Exception | None = None):
  error = InvalidBackupError("Invalid backup or passphrase")
  if exc is None:
    raise error
  raise error from exc


def decrypt_backup(
  input_path: Path,
  dump_path: Path,
  passphrase: str,
  policy: EnvelopePolicy,
) -> BackupManifest:
  input_path = Path(input_path)
  dump_path = Path(dump_path)
  payload_path = None
  try:
    try:
      encoded_passphrase = _validate_passphrase(passphrase)
    except ValueError as exc:
      _raise_invalid(exc)

    file_size = input_path.stat().st_size
    if file_size < HEADER_STRUCT.size + TAG_BYTES or file_size > policy.max_bytes:
      _raise_invalid()

    with input_path.open("rb") as encrypted:
      header = encrypted.read(HEADER_STRUCT.size)
      if len(header) != HEADER_STRUCT.size:
        _raise_invalid()
      magic, version, scrypt_n, scrypt_r, scrypt_p, salt, nonce, ciphertext_bytes = (
        HEADER_STRUCT.unpack(header)
      )
      if (
        magic != MAGIC
        or version != FORMAT_VERSION
        or scrypt_n != policy.scrypt_n
        or scrypt_r != policy.scrypt_r
        or scrypt_p != policy.scrypt_p
        or ciphertext_bytes != file_size - HEADER_STRUCT.size - TAG_BYTES
        or ciphertext_bytes > policy.max_bytes - HEADER_STRUCT.size - TAG_BYTES
      ):
        _raise_invalid()

      encrypted.seek(-TAG_BYTES, os.SEEK_END)
      tag = encrypted.read(TAG_BYTES)
      encrypted.seek(HEADER_STRUCT.size)
      key = _derive_key(encoded_passphrase, salt, policy)
      decryptor = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
      decryptor.authenticate_additional_data(header)

      with tempfile.NamedTemporaryFile(
        mode="wb",
        dir=dump_path.parent,
        prefix=".pahina-payload-",
        delete=False,
      ) as payload:
        payload_path = Path(payload.name)
        remaining = ciphertext_bytes
        while remaining:
          chunk = encrypted.read(min(CHUNK_BYTES, remaining))
          if not chunk:
            _raise_invalid()
          remaining -= len(chunk)
          payload.write(decryptor.update(chunk))
        payload.write(decryptor.finalize())

    with payload_path.open("rb") as payload:
      manifest_length_bytes = payload.read(UINT32.size)
      if len(manifest_length_bytes) != UINT32.size:
        _raise_invalid()
      manifest_length = UINT32.unpack(manifest_length_bytes)[0]
      if manifest_length > policy.max_manifest_bytes:
        _raise_invalid()
      manifest_json = payload.read(manifest_length)
      if len(manifest_json) != manifest_length:
        _raise_invalid()
      manifest = BackupManifest.from_dict(json.loads(manifest_json.decode("utf-8")))

      dump_length_bytes = payload.read(UINT64.size)
      if len(dump_length_bytes) != UINT64.size:
        _raise_invalid()
      dump_length = UINT64.unpack(dump_length_bytes)[0]
      expected_payload_bytes = UINT32.size + manifest_length + UINT64.size + dump_length
      if (
        dump_length > policy.max_bytes
        or expected_payload_bytes != ciphertext_bytes
        or dump_length != manifest.dump_bytes
      ):
        _raise_invalid()

      digest = hashlib.sha256()
      remaining = dump_length
      with dump_path.open("wb") as dump:
        while remaining:
          chunk = payload.read(min(CHUNK_BYTES, remaining))
          if not chunk:
            _raise_invalid()
          remaining -= len(chunk)
          dump.write(chunk)
          digest.update(chunk)
      if payload.read(1) or digest.hexdigest() != manifest.dump_sha256:
        _raise_invalid()

    return manifest
  except InvalidBackupError:
    dump_path.unlink(missing_ok=True)
    raise
  except (InvalidTag, OSError, ValueError, TypeError, struct.error, json.JSONDecodeError) as exc:
    dump_path.unlink(missing_ok=True)
    _raise_invalid(exc)
  finally:
    if payload_path is not None:
      payload_path.unlink(missing_ok=True)
