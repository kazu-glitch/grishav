import db


class FakeConnection:
    def __init__(self):
        self.rolled_back = False
        self.closed = False

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def test_connection_rolls_back_and_closes_after_an_error(monkeypatch):
    connection = FakeConnection()
    monkeypatch.setattr(db.mysql.connector, "connect", lambda **kwargs: connection)

    try:
        with db.get_connection():
            raise RuntimeError("write failed")
    except RuntimeError:
        pass

    assert connection.rolled_back is True
    assert connection.closed is True
