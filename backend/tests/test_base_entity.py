import unittest

from app.models.base import BaseEntity


class BaseEntityContractTest(unittest.TestCase):
    def test_subclass_without_to_dict_cannot_be_instantiated(self):
        class IncompleteEntity(BaseEntity):
            __tablename__ = "test_incomplete_entities"

        with self.assertRaisesRegex(TypeError, "abstract method 'to_dict'"):
            IncompleteEntity()

    def test_subclass_with_to_dict_can_be_instantiated(self):
        class CompleteEntity(BaseEntity):
            __tablename__ = "test_complete_entities"

            def to_dict(self):
                return {"kind": "complete"}

        self.assertEqual(CompleteEntity().to_dict(), {"kind": "complete"})


if __name__ == "__main__":
    unittest.main()
