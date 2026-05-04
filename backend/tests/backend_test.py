"""StudentHub backend API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env (testing context)
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@studenthub.in"
ADMIN_PASS = "Admin@123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def student(session):
    """Register + onboard a fresh student."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={
        "name": "Test Student", "email": email, "password": "Stu@1234"
    })
    assert r.status_code == 200, f"register: {r.status_code} {r.text}"
    data = r.json()
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # onboard
    r2 = session.post(f"{API}/auth/onboarding",
                      json={"college": "MAKAUT", "department": "CSE", "year": 2},
                      headers=headers)
    assert r2.status_code == 200, f"onboarding: {r2.status_code} {r2.text}"
    return {"email": email, "token": token, "headers": headers, "user": r2.json()}


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert "StudentHub" in r.json().get("message", "")


# ---------- Auth ----------
class TestAuth:
    def test_register_creates_user(self, session):
        email = f"reg_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register",
                         json={"name": "Reg User", "email": email, "password": "Reg@1234"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert data["user"]["email"] == email
        assert data["user"]["onboarded"] is False
        assert data["user"]["role"] == "student"
        assert "id" in data["user"]

    def test_register_duplicate_email(self, session):
        email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
        session.post(f"{API}/auth/register",
                     json={"name": "U", "email": email, "password": "Pwd@1234"})
        r = session.post(f"{API}/auth/register",
                         json={"name": "U", "email": email, "password": "Pwd@1234"})
        assert r.status_code == 400

    def test_admin_login(self, session):
        r = session.post(f"{API}/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["isPremium"] is True
        assert data["user"]["onboarded"] is True

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login",
                         json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_token(self, session, admin_headers):
        r = session.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_onboarding_sets_flag(self, session):
        email = f"ob_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register",
                         json={"name": "OB", "email": email, "password": "Ob@12345"})
        token = r.json()["token"]
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        r2 = session.post(f"{API}/auth/onboarding",
                          json={"college": "MAKAUT", "department": "CSE", "year": 2}, headers=h)
        assert r2.status_code == 200
        u = r2.json()
        assert u["college"] == "MAKAUT"
        assert u["department"] == "CSE"
        assert u["year"] == 2
        assert u["onboarded"] is True
        # verify via GET /me
        r3 = session.get(f"{API}/auth/me", headers=h)
        assert r3.json()["onboarded"] is True


# ---------- Colleges/Departments ----------
class TestCollegesDepts:
    def test_colleges(self, session):
        r = session.get(f"{API}/colleges")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        names = [c["shortName"] for c in items]
        assert "MAKAUT" in names

    def test_departments_for_makaut(self, session):
        r = session.get(f"{API}/departments", params={"collegeId": "makaut"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 5
        codes = [d["code"] for d in items]
        assert "CSE" in codes


# ---------- Subjects/Files ----------
class TestSubjects:
    def test_subjects_scoped_to_admin(self, session, admin_headers):
        r = session.get(f"{API}/subjects", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()
        # admin is CSE Y2 → at least 5 subjects seeded (TEST_ entries may add more)
        assert len(items) >= 5
        for s in items:
            assert s["department"] == "CSE"
            assert s["year"] == 2
        codes = {s["code"] for s in items}
        for expected in ["CS301", "CS302", "CS303", "CS401", "CS402"]:
            assert expected in codes

    def test_subjects_unauthenticated(self, session):
        r = session.get(f"{API}/subjects")
        assert r.status_code == 401

    def test_get_subject_by_id(self, session, admin_headers):
        r = session.get(f"{API}/subjects", headers=admin_headers)
        sid = r.json()[0]["id"]
        r2 = session.get(f"{API}/subjects/{sid}", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json()["id"] == sid

    def test_subject_files(self, session, admin_headers):
        subjects = session.get(f"{API}/subjects", headers=admin_headers).json()
        dsa = next((s for s in subjects if s["code"] == "CS301"), None)
        assert dsa is not None
        r = session.get(f"{API}/subjects/{dsa['id']}/files", headers=admin_headers)
        assert r.status_code == 200
        files = r.json()
        assert len(files) >= 3

    def test_subject_tests(self, session, admin_headers):
        subjects = session.get(f"{API}/subjects", headers=admin_headers).json()
        dsa = next((s for s in subjects if s["code"] == "CS301"), None)
        r = session.get(f"{API}/subjects/{dsa['id']}/tests", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ---------- Tests / attempts ----------
class TestMockTests:
    def _get_dsa_test(self, session, headers):
        subjects = session.get(f"{API}/subjects", headers=headers).json()
        dsa = next(s for s in subjects if s["code"] == "CS301")
        tests = session.get(f"{API}/subjects/{dsa['id']}/tests", headers=headers).json()
        return tests[0]

    def _get_premium_test(self, session, headers):
        subjects = session.get(f"{API}/subjects", headers=headers).json()
        dbms = next(s for s in subjects if s["code"] == "CS303")
        tests = session.get(f"{API}/subjects/{dbms['id']}/tests", headers=headers).json()
        return next(t for t in tests if t["isPremium"])

    def test_get_test_admin(self, session, admin_headers):
        t = self._get_dsa_test(session, admin_headers)
        r = session.get(f"{API}/tests/{t['id']}", headers=admin_headers)
        assert r.status_code == 200
        assert "questions" in r.json()

    def test_premium_blocked_for_non_premium(self, session, student, admin_headers):
        prem = self._get_premium_test(session, admin_headers)
        r = session.get(f"{API}/tests/{prem['id']}", headers=student["headers"])
        assert r.status_code == 402, r.text

    def test_premium_allowed_for_admin(self, session, admin_headers):
        prem = self._get_premium_test(session, admin_headers)
        r = session.get(f"{API}/tests/{prem['id']}", headers=admin_headers)
        assert r.status_code == 200

    def test_submit_and_score(self, session, student, admin_headers):
        t_meta = self._get_dsa_test(session, student["headers"])
        # fetch full test for student
        r = session.get(f"{API}/tests/{t_meta['id']}", headers=student["headers"])
        assert r.status_code == 200
        full = r.json()
        # answer all correctly
        answers = [q["correctIndex"] for q in full["questions"]]
        # leave last skipped
        answers[-1] = -1
        r2 = session.post(f"{API}/tests/submit",
                          json={"testId": full["id"], "answers": answers, "timeTakenSec": 120},
                          headers=student["headers"])
        assert r2.status_code == 200, r2.text
        att = r2.json()
        total = len(full["questions"])
        assert att["total"] == total
        assert att["correct"] == total - 1
        assert att["wrong"] == 0
        assert att["skipped"] == 1
        # score = correct/total*100
        assert att["score"] == int(((total - 1) / total) * 100)
        assert "id" in att
        # store for next test via fixture isn't easy; do GET attempt directly here
        r3 = session.get(f"{API}/attempts/{att['id']}", headers=student["headers"])
        assert r3.status_code == 200
        body = r3.json()
        assert body["attempt"]["id"] == att["id"]
        assert body["test"]["id"] == full["id"]

    def test_attempts_me(self, session, student):
        r = session.get(f"{API}/attempts/me", headers=student["headers"])
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # student has at least 1 attempt from previous test
        assert len(r.json()) >= 1

    def test_submit_answer_count_mismatch(self, session, student, admin_headers):
        t_meta = TestMockTests()._get_dsa_test(session, student["headers"])
        r = session.post(f"{API}/tests/submit",
                         json={"testId": t_meta["id"], "answers": [0], "timeTakenSec": 1},
                         headers=student["headers"])
        assert r.status_code == 400


# ---------- Progress / Search ----------
class TestProgressSearch:
    def test_progress_me(self, session, student):
        r = session.get(f"{API}/progress/me", headers=student["headers"])
        assert r.status_code == 200
        d = r.json()
        for k in ("testsTaken", "averageScore", "subjectsCovered", "totalSubjects"):
            assert k in d
        assert d["totalSubjects"] >= 5  # CSE Y2

    def test_search(self, session, admin_headers):
        r = session.get(f"{API}/search", params={"q": "DSA"}, headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "subjects" in d and "tests" in d and "files" in d
        # Expect at least one match in any of the three
        assert (len(d["subjects"]) + len(d["tests"]) + len(d["files"])) > 0

    def test_search_short_query(self, session, admin_headers):
        r = session.get(f"{API}/search", params={"q": "a"}, headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert d == {"subjects": [], "tests": [], "files": []}


# ---------- Payments ----------
class TestPayments:
    def test_payments_config(self, session):
        r = session.get(f"{API}/payments/config")
        assert r.status_code == 200
        d = r.json()
        assert d["enabled"] is False
        assert d["plans"] == {"monthly": 49, "yearly": 499}

    def test_create_order_mock(self, session, student):
        r = session.post(f"{API}/payments/order", json={"plan": "monthly"},
                         headers=student["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mock"] is True
        assert d["id"].startswith("order_mock_")
        assert d["amount"] == 49 * 100

    def test_verify_without_keys(self, session, student):
        r = session.post(f"{API}/payments/verify", json={
            "razorpay_order_id": "order_x",
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "sig",
            "plan": "monthly",
        }, headers=student["headers"])
        assert r.status_code == 400


# ---------- Admin ----------
class TestAdmin:
    def test_create_subject_requires_admin(self, session, student):
        r = session.post(f"{API}/subjects", json={
            "name": "TEST_Subject", "code": "TST901",
            "department": "CSE", "year": 2, "semester": 3,
        }, headers=student["headers"])
        assert r.status_code == 403

    def test_admin_create_subject_file_test(self, session, admin_headers):
        # subject
        r = session.post(f"{API}/subjects", json={
            "name": "TEST_Discrete Math", "code": f"TST{uuid.uuid4().hex[:4].upper()}",
            "department": "CSE", "year": 2, "semester": 3,
            "description": "test", "color": "#ff00ff",
        }, headers=admin_headers)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        # file
        r2 = session.post(f"{API}/files", json={
            "subjectId": sid, "title": "TEST_File", "type": "CA",
            "year": 2024, "fileUrl": "https://example.com/x.pdf", "isPremium": False,
        }, headers=admin_headers)
        assert r2.status_code == 200, r2.text
        # test
        r3 = session.post(f"{API}/tests", json={
            "subjectId": sid, "title": "TEST_Test", "duration": 5, "isPremium": False,
            "questions": [{
                "id": "", "question": "1+1?", "options": ["1", "2", "3", "4"],
                "correctIndex": 1, "explanation": "two",
            }],
        }, headers=admin_headers)
        assert r3.status_code == 200, r3.text
        # cleanup: delete subject's file
        fid = r2.json()["id"]
        session.delete(f"{API}/files/{fid}", headers=admin_headers)

    def test_admin_stats(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "subjects", "files", "tests", "attempts"):
            assert k in d and isinstance(d[k], int)

    def test_admin_stats_forbidden_for_student(self, session, student):
        r = session.get(f"{API}/admin/stats", headers=student["headers"])
        assert r.status_code == 403
