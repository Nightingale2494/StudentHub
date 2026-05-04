from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, status, UploadFile, File
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
JWT_EXP_DAYS = 7


# --- Utils ---
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(days=JWT_EXP_DAYS),
        "iat": now_utc(),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])


# --- Models ---
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    role: str = "student"
    isPremium: bool = False
    plan: Optional[str] = None
    expiryDate: Optional[str] = None
    onboarded: bool = False
    createdAt: str


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OnboardingIn(BaseModel):
    college: str
    department: str
    year: int


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class College(BaseModel):
    id: str
    name: str
    shortName: Optional[str] = None


class Department(BaseModel):
    id: str
    name: str
    code: str
    collegeId: str


class Subject(BaseModel):
    id: str
    name: str
    code: str
    department: str  # department code, e.g. CSE
    year: int
    semester: int
    description: Optional[str] = None
    color: Optional[str] = None


class SubjectIn(BaseModel):
    name: str
    code: str
    department: str
    year: int
    semester: int
    description: Optional[str] = None
    color: Optional[str] = None


class FileResource(BaseModel):
    id: str
    subjectId: str
    title: str
    type: Literal["CA", "PCA", "SEM", "IMPORTANT"]
    year: int
    fileUrl: str
    isPremium: bool = False
    createdAt: str


class FileResourceIn(BaseModel):
    subjectId: str
    title: str
    type: Literal["CA", "PCA", "SEM", "IMPORTANT"]
    year: int
    fileUrl: str
    isPremium: bool = False


class MCQ(BaseModel):
    id: str
    question: str
    options: List[str]
    correctIndex: int
    explanation: Optional[str] = None


class MockTest(BaseModel):
    id: str
    subjectId: str
    title: str
    duration: int  # minutes
    isPremium: bool = False
    questions: List[MCQ]
    createdAt: str


class MockTestIn(BaseModel):
    subjectId: str
    title: str
    duration: int
    isPremium: bool = False
    questions: List[MCQ]


class TestAttemptIn(BaseModel):
    testId: str
    answers: List[int]  # selected index per question, -1 if skipped
    timeTakenSec: int


class TestAttempt(BaseModel):
    id: str
    userId: str
    testId: str
    subjectId: str
    score: int
    total: int
    correct: int
    wrong: int
    skipped: int
    timeTakenSec: int
    answers: List[int]
    createdAt: str


class OrderIn(BaseModel):
    plan: Literal["monthly", "yearly"] = "monthly"


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: Literal["monthly", "yearly"] = "monthly"


# --- App ---
app = FastAPI(title="StudentHub API")
api = APIRouter(prefix="/api")


# --- Auth dependency ---
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def user_to_public(u: dict) -> UserPublic:
    return UserPublic(
        id=u["id"],
        name=u["name"],
        email=u["email"],
        college=u.get("college"),
        department=u.get("department"),
        year=u.get("year"),
        role=u.get("role", "student"),
        isPremium=u.get("isPremium", False),
        plan=u.get("plan"),
        expiryDate=u.get("expiryDate"),
        onboarded=u.get("onboarded", False),
        createdAt=u["createdAt"],
    )


# --- Auth routes ---
@api.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": body.name.strip(),
        "email": email,
        "passwordHash": hash_password(body.password),
        "role": "student",
        "college": None,
        "department": None,
        "year": None,
        "isPremium": False,
        "plan": None,
        "expiryDate": None,
        "onboarded": False,
        "createdAt": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    token = create_token(uid, email)
    doc.pop("passwordHash", None)
    doc.pop("_id", None)
    return AuthResponse(token=token, user=user_to_public(doc))


@api.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    user.pop("passwordHash", None)
    return AuthResponse(token=token, user=user_to_public(user))


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return user_to_public(user)


@api.post("/auth/onboarding", response_model=UserPublic)
async def onboarding(body: OnboardingIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "college": body.college,
            "department": body.department,
            "year": body.year,
            "onboarded": True,
        }},
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return user_to_public(updated)


# --- Colleges & Departments ---
@api.get("/colleges", response_model=List[College])
async def list_colleges():
    items = await db.colleges.find({}, {"_id": 0}).to_list(200)
    return items


@api.get("/departments", response_model=List[Department])
async def list_departments(collegeId: Optional[str] = None):
    q = {}
    if collegeId:
        q["collegeId"] = collegeId
    items = await db.departments.find(q, {"_id": 0}).to_list(200)
    return items


# --- Subjects ---
@api.get("/subjects", response_model=List[Subject])
async def list_subjects(department: Optional[str] = None, year: Optional[int] = None,
                       user: dict = Depends(get_current_user)):
    q = {}
    if department:
        q["department"] = department
    elif user.get("department"):
        q["department"] = user["department"]
    if year:
        q["year"] = year
    elif user.get("year"):
        q["year"] = user["year"]
    items = await db.subjects.find(q, {"_id": 0}).to_list(500)
    return items


@api.get("/subjects/{subject_id}", response_model=Subject)
async def get_subject(subject_id: str, user: dict = Depends(get_current_user)):
    s = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    return s


@api.post("/subjects", response_model=Subject)
async def create_subject(body: SubjectIn, admin: dict = Depends(require_admin)):
    sid = str(uuid.uuid4())
    doc = {"id": sid, **body.model_dump()}
    await db.subjects.insert_one(dict(doc))
    return doc


# --- Files ---
@api.get("/subjects/{subject_id}/files", response_model=List[FileResource])
async def list_subject_files(subject_id: str, type: Optional[str] = None,
                             user: dict = Depends(get_current_user)):
    q = {"subjectId": subject_id}
    if type:
        q["type"] = type
    items = await db.files.find(q, {"_id": 0}).sort("year", -1).to_list(500)
    return items


@api.post("/files", response_model=FileResource)
async def create_file(body: FileResourceIn, admin: dict = Depends(require_admin)):
    fid = str(uuid.uuid4())
    doc = {"id": fid, **body.model_dump(), "createdAt": iso(now_utc())}
    await db.files.insert_one(dict(doc))
    return doc


@api.delete("/files/{file_id}")
async def delete_file(file_id: str, admin: dict = Depends(require_admin)):
    res = await db.files.delete_one({"id": file_id})
    return {"deleted": res.deleted_count}


# --- Firebase Storage upload ---
_firebase_app = None
_firebase_bucket = None


def _get_firebase_bucket():
    """Lazily initialise Firebase Admin. Returns None if not configured."""
    global _firebase_app, _firebase_bucket
    if _firebase_bucket is not None:
        return _firebase_bucket
    cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "")
    if not cred_path or not bucket_name or not os.path.exists(cred_path):
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials, storage as fb_storage
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
        _firebase_bucket = fb_storage.bucket()
        return _firebase_bucket
    except Exception as e:
        logging.error(f"Firebase init failed: {e}")
        return None


@api.get("/uploads/config")
async def uploads_config(admin: dict = Depends(require_admin)):
    bucket = _get_firebase_bucket()
    return {
        "enabled": bucket is not None,
        "bucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
    }


@api.post("/uploads/pdf")
async def upload_pdf(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    bucket = _get_firebase_bucket()
    if bucket is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Firebase Storage not configured. Add firebase-admin.json to "
                "/app/backend/secrets/ and set FIREBASE_STORAGE_BUCKET in backend/.env."
            ),
        )
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    content_type = (file.content_type or "").lower()
    if "pdf" not in content_type and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    # Read & size-check (25 MB cap)
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    # Unique blob path: pdfs/<uuid>-<original-name>
    safe_name = "".join(c for c in file.filename if c.isalnum() or c in ("-", "_", ".")).strip(".")
    blob_name = f"pdfs/{uuid.uuid4().hex[:12]}-{safe_name or 'file.pdf'}"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(data, content_type="application/pdf")
    blob.make_public()
    public_url = blob.public_url
    return {
        "ok": True,
        "url": public_url,
        "path": blob_name,
        "size": len(data),
        "filename": file.filename,
    }


# --- Mock tests ---
@api.get("/subjects/{subject_id}/tests", response_model=List[MockTest])
async def list_tests(subject_id: str, user: dict = Depends(get_current_user)):
    items = await db.tests.find({"subjectId": subject_id}, {"_id": 0}).to_list(200)
    return items


@api.get("/tests/{test_id}", response_model=MockTest)
async def get_test(test_id: str, user: dict = Depends(get_current_user)):
    t = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    if t.get("isPremium") and not user.get("isPremium"):
        raise HTTPException(status_code=402, detail="Premium required")
    return t


@api.post("/tests", response_model=MockTest)
async def create_test(body: MockTestIn, admin: dict = Depends(require_admin)):
    tid = str(uuid.uuid4())
    # Give each question an id if missing
    questions = []
    for q in body.questions:
        qd = q.model_dump()
        if not qd.get("id"):
            qd["id"] = str(uuid.uuid4())
        questions.append(qd)
    doc = {
        "id": tid,
        "subjectId": body.subjectId,
        "title": body.title,
        "duration": body.duration,
        "isPremium": body.isPremium,
        "questions": questions,
        "createdAt": iso(now_utc()),
    }
    await db.tests.insert_one(dict(doc))
    return doc


@api.post("/tests/submit", response_model=TestAttempt)
async def submit_test(body: TestAttemptIn, user: dict = Depends(get_current_user)):
    t = await db.tests.find_one({"id": body.testId}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Test not found")
    questions = t["questions"]
    if len(body.answers) != len(questions):
        raise HTTPException(status_code=400, detail="Answer count mismatch")
    correct = 0
    wrong = 0
    skipped = 0
    for i, ans in enumerate(body.answers):
        if ans == -1:
            skipped += 1
        elif ans == questions[i]["correctIndex"]:
            correct += 1
        else:
            wrong += 1
    total = len(questions)
    score = int((correct / total) * 100) if total else 0
    attempt = {
        "id": str(uuid.uuid4()),
        "userId": user["id"],
        "testId": body.testId,
        "subjectId": t["subjectId"],
        "score": score,
        "total": total,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "timeTakenSec": body.timeTakenSec,
        "answers": body.answers,
        "createdAt": iso(now_utc()),
    }
    await db.attempts.insert_one(dict(attempt))
    return attempt


@api.get("/attempts/me", response_model=List[TestAttempt])
async def my_attempts(user: dict = Depends(get_current_user)):
    items = await db.attempts.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)
    return items


@api.get("/attempts/{attempt_id}")
async def get_attempt(attempt_id: str, user: dict = Depends(get_current_user)):
    a = await db.attempts.find_one({"id": attempt_id}, {"_id": 0})
    if not a or a["userId"] != user["id"]:
        raise HTTPException(status_code=404, detail="Attempt not found")
    t = await db.tests.find_one({"id": a["testId"]}, {"_id": 0})
    return {"attempt": a, "test": t}


# --- Progress stats ---
@api.get("/progress/me")
async def my_progress(user: dict = Depends(get_current_user)):
    attempts = await db.attempts.find({"userId": user["id"]}, {"_id": 0}).to_list(500)
    total_tests = len(attempts)
    avg_score = round(sum(a["score"] for a in attempts) / total_tests, 1) if total_tests else 0
    subjects_covered = len({a["subjectId"] for a in attempts})
    # Count subjects matching user's department+year
    subj_q = {}
    if user.get("department"):
        subj_q["department"] = user["department"]
    if user.get("year"):
        subj_q["year"] = user["year"]
    total_subjects = await db.subjects.count_documents(subj_q)
    return {
        "testsTaken": total_tests,
        "averageScore": avg_score,
        "subjectsCovered": subjects_covered,
        "totalSubjects": total_subjects,
    }


# --- Search ---
@api.get("/search")
async def search(q: str, user: dict = Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return {"subjects": [], "tests": [], "files": []}
    regex = {"$regex": q, "$options": "i"}
    # Scope to user's dept/year for subjects
    subj_q = {"$or": [{"name": regex}, {"code": regex}]}
    if user.get("department"):
        subj_q["department"] = user["department"]
    subjects = await db.subjects.find(subj_q, {"_id": 0}).limit(10).to_list(10)
    tests = await db.tests.find({"title": regex}, {"_id": 0, "questions": 0}).limit(10).to_list(10)
    files = await db.files.find({"title": regex}, {"_id": 0}).limit(10).to_list(10)
    return {"subjects": subjects, "tests": tests, "files": files}


# --- Razorpay ---
PLAN_PRICES = {"monthly": 49, "yearly": 499}  # INR


def _razorpay_client():
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        return None
    import razorpay
    return razorpay.Client(auth=(key_id, key_secret))


@api.get("/payments/config")
async def payment_config():
    return {
        "keyId": os.environ.get("RAZORPAY_KEY_ID", ""),
        "enabled": bool(os.environ.get("RAZORPAY_KEY_ID")) and bool(os.environ.get("RAZORPAY_KEY_SECRET")),
        "plans": PLAN_PRICES,
    }


@api.post("/payments/order")
async def create_order(body: OrderIn, user: dict = Depends(get_current_user)):
    rz = _razorpay_client()
    amount_inr = PLAN_PRICES.get(body.plan, 49)
    amount_paise = amount_inr * 100
    if rz is None:
        # scaffold mode - return a mock order so frontend flow can be tested
        return {
            "id": f"order_mock_{uuid.uuid4().hex[:12]}",
            "amount": amount_paise,
            "currency": "INR",
            "mock": True,
            "plan": body.plan,
        }
    order = rz.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"userId": user["id"], "plan": body.plan},
    })
    return {**order, "mock": False, "plan": body.plan}


@api.post("/payments/verify")
async def verify_payment(body: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_secret:
        raise HTTPException(status_code=400, detail="Payments not configured. Add RAZORPAY keys in backend/.env")
    expected = hmac.new(
        key_secret.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    # Update user to premium
    duration_days = 30 if body.plan == "monthly" else 365
    expiry = now_utc() + timedelta(days=duration_days)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"isPremium": True, "plan": body.plan, "expiryDate": iso(expiry)}},
    )
    return {"ok": True, "plan": body.plan, "expiryDate": iso(expiry)}


@api.post("/payments/webhook")
async def razorpay_webhook(request: Request):
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    if not secret:
        return {"ok": False, "reason": "webhook secret not configured"}
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    # Log webhook event
    import json as _json
    try:
        data = _json.loads(body.decode("utf-8"))
    except Exception:
        data = {"raw": body.decode("utf-8", errors="ignore")}
    await db.webhook_logs.insert_one({"event": data.get("event"), "data": data, "createdAt": iso(now_utc())})
    return {"ok": True}


# --- Admin helper routes ---
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "subjects": await db.subjects.count_documents({}),
        "files": await db.files.count_documents({}),
        "tests": await db.tests.count_documents({}),
        "attempts": await db.attempts.count_documents({}),
    }


# --- Health ---
@api.get("/")
async def root():
    return {"message": "StudentHub API running"}


# --- Seed ---
async def ensure_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@studenthub.in").lower()
    password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        doc = {
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": email,
            "passwordHash": hash_password(password),
            "role": "admin",
            "college": "MAKAUT",
            "department": "CSE",
            "year": 2,
            "isPremium": True,
            "plan": "yearly",
            "expiryDate": iso(now_utc() + timedelta(days=3650)),
            "onboarded": True,
            "createdAt": iso(now_utc()),
        }
        await db.users.insert_one(doc)
    else:
        # keep password in sync with env
        if not verify_password(password, existing["passwordHash"]):
            await db.users.update_one({"email": email}, {"$set": {"passwordHash": hash_password(password)}})


async def seed_data():
    # Colleges
    if await db.colleges.count_documents({}) == 0:
        colleges = [
            {"id": "makaut", "name": "Maulana Abul Kalam Azad University of Technology", "shortName": "MAKAUT"},
            {"id": "ju", "name": "Jadavpur University", "shortName": "JU"},
            {"id": "iiest", "name": "IIEST Shibpur", "shortName": "IIEST"},
        ]
        await db.colleges.insert_many(colleges)

    if await db.departments.count_documents({}) == 0:
        depts = [
            {"id": "makaut-cse", "name": "Computer Science & Engineering", "code": "CSE", "collegeId": "makaut"},
            {"id": "makaut-it", "name": "Information Technology", "code": "IT", "collegeId": "makaut"},
            {"id": "makaut-ece", "name": "Electronics & Communication", "code": "ECE", "collegeId": "makaut"},
            {"id": "makaut-ee", "name": "Electrical Engineering", "code": "EE", "collegeId": "makaut"},
            {"id": "makaut-me", "name": "Mechanical Engineering", "code": "ME", "collegeId": "makaut"},
            {"id": "ju-cse", "name": "Computer Science & Engineering", "code": "CSE", "collegeId": "ju"},
            {"id": "iiest-cse", "name": "Computer Science & Engineering", "code": "CSE", "collegeId": "iiest"},
        ]
        await db.departments.insert_many(depts)

    if await db.subjects.count_documents({}) == 0:
        subjects = [
            {"id": str(uuid.uuid4()), "name": "Data Structures & Algorithms", "code": "CS301",
             "department": "CSE", "year": 2, "semester": 3,
             "description": "Arrays, trees, graphs, dynamic programming, complexity analysis.",
             "color": "#0066FF"},
            {"id": str(uuid.uuid4()), "name": "Operating Systems", "code": "CS302",
             "department": "CSE", "year": 2, "semester": 3,
             "description": "Processes, threads, scheduling, memory, file systems.",
             "color": "#00E5FF"},
            {"id": str(uuid.uuid4()), "name": "Database Management Systems", "code": "CS303",
             "department": "CSE", "year": 2, "semester": 3,
             "description": "Relational model, SQL, normalization, transactions.",
             "color": "#B266FF"},
            {"id": str(uuid.uuid4()), "name": "Computer Networks", "code": "CS401",
             "department": "CSE", "year": 2, "semester": 4,
             "description": "OSI, TCP/IP, routing, application layer protocols.",
             "color": "#00C853"},
            {"id": str(uuid.uuid4()), "name": "Software Engineering", "code": "CS402",
             "department": "CSE", "year": 2, "semester": 4,
             "description": "SDLC, agile, testing, design patterns.",
             "color": "#FFBF00"},
            {"id": str(uuid.uuid4()), "name": "Design & Analysis of Algorithms", "code": "CS501",
             "department": "CSE", "year": 3, "semester": 5,
             "description": "Divide & conquer, greedy, DP, NP-completeness.",
             "color": "#FF3366"},
        ]
        await db.subjects.insert_many(subjects)

        # Grab subject ids
        dsa = next(s for s in subjects if s["code"] == "CS301")
        os_s = next(s for s in subjects if s["code"] == "CS302")
        dbms = next(s for s in subjects if s["code"] == "CS303")

        sample_pdf = "https://africau.edu/images/default/sample.pdf"
        files = [
            {"id": str(uuid.uuid4()), "subjectId": dsa["id"], "title": "DSA CA-1 2024",
             "type": "CA", "year": 2024, "fileUrl": sample_pdf, "isPremium": False,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": dsa["id"], "title": "DSA Semester Paper 2023",
             "type": "SEM", "year": 2023, "fileUrl": sample_pdf, "isPremium": False,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": dsa["id"], "title": "DSA Important Questions (Premium)",
             "type": "IMPORTANT", "year": 2024, "fileUrl": sample_pdf, "isPremium": True,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": os_s["id"], "title": "OS PCA 2024",
             "type": "PCA", "year": 2024, "fileUrl": sample_pdf, "isPremium": False,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": os_s["id"], "title": "OS Sem Paper 2022",
             "type": "SEM", "year": 2022, "fileUrl": sample_pdf, "isPremium": False,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": dbms["id"], "title": "DBMS CA-2 2023",
             "type": "CA", "year": 2023, "fileUrl": sample_pdf, "isPremium": False,
             "createdAt": iso(now_utc())},
            {"id": str(uuid.uuid4()), "subjectId": dbms["id"], "title": "DBMS Important Questions (Premium)",
             "type": "IMPORTANT", "year": 2024, "fileUrl": sample_pdf, "isPremium": True,
             "createdAt": iso(now_utc())},
        ]
        await db.files.insert_many(files)

        # Mock tests
        dsa_test = {
            "id": str(uuid.uuid4()),
            "subjectId": dsa["id"],
            "title": "DSA - Arrays & Complexity",
            "duration": 10,
            "isPremium": False,
            "questions": [
                {"id": str(uuid.uuid4()), "question": "What is the time complexity of binary search on a sorted array of size n?",
                 "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                 "correctIndex": 1, "explanation": "Each step halves the search space."},
                {"id": str(uuid.uuid4()), "question": "Which data structure uses LIFO ordering?",
                 "options": ["Queue", "Stack", "Heap", "Linked List"],
                 "correctIndex": 1, "explanation": "Stack is Last-In-First-Out."},
                {"id": str(uuid.uuid4()), "question": "Worst-case complexity of QuickSort?",
                 "options": ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
                 "correctIndex": 2, "explanation": "When pivot is always smallest/largest."},
                {"id": str(uuid.uuid4()), "question": "Which traversal visits root-left-right?",
                 "options": ["Inorder", "Preorder", "Postorder", "Level order"],
                 "correctIndex": 1, "explanation": "Preorder = root, left, right."},
                {"id": str(uuid.uuid4()), "question": "Best data structure for implementing Dijkstra's algorithm efficiently?",
                 "options": ["Array", "Stack", "Min-heap (priority queue)", "Hash table"],
                 "correctIndex": 2, "explanation": "A min-heap gives O((V+E) log V)."},
            ],
            "createdAt": iso(now_utc()),
        }
        os_test = {
            "id": str(uuid.uuid4()),
            "subjectId": os_s["id"],
            "title": "OS - Processes & Scheduling",
            "duration": 8,
            "isPremium": False,
            "questions": [
                {"id": str(uuid.uuid4()), "question": "Which scheduling algorithm can cause starvation?",
                 "options": ["FCFS", "Round Robin", "Priority", "Shortest Job First"],
                 "correctIndex": 2, "explanation": "Low-priority processes may never run."},
                {"id": str(uuid.uuid4()), "question": "A process in the 'ready' state is waiting for...",
                 "options": ["CPU", "I/O", "Memory", "A semaphore"],
                 "correctIndex": 0, "explanation": "Ready processes wait for CPU."},
                {"id": str(uuid.uuid4()), "question": "Which is NOT a page replacement algorithm?",
                 "options": ["LRU", "FIFO", "Optimal", "SJF"],
                 "correctIndex": 3, "explanation": "SJF is a CPU scheduling algorithm."},
                {"id": str(uuid.uuid4()), "question": "Deadlock requires all of the following EXCEPT:",
                 "options": ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
                 "correctIndex": 2, "explanation": "No preemption is required, not preemption."},
            ],
            "createdAt": iso(now_utc()),
        }
        dbms_test = {
            "id": str(uuid.uuid4()),
            "subjectId": dbms["id"],
            "title": "DBMS - SQL & Normalization (Premium)",
            "duration": 10,
            "isPremium": True,
            "questions": [
                {"id": str(uuid.uuid4()), "question": "Which normal form removes partial dependencies?",
                 "options": ["1NF", "2NF", "3NF", "BCNF"],
                 "correctIndex": 1, "explanation": "2NF removes partial dependencies."},
                {"id": str(uuid.uuid4()), "question": "SQL command to remove a table permanently?",
                 "options": ["DELETE", "DROP", "TRUNCATE", "REMOVE"],
                 "correctIndex": 1, "explanation": "DROP removes the table."},
                {"id": str(uuid.uuid4()), "question": "ACID stands for:",
                 "options": ["Atomic, Consistent, Isolated, Durable", "Atomic, Clean, Indexed, Distributed",
                             "Available, Consistent, Isolated, Durable", "Atomic, Concurrent, Isolated, Deterministic"],
                 "correctIndex": 0, "explanation": "Core transaction properties."},
            ],
            "createdAt": iso(now_utc()),
        }
        await db.tests.insert_many([dsa_test, os_test, dbms_test])


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.subjects.create_index("id", unique=True)
    await db.subjects.create_index([("department", 1), ("year", 1)])
    await db.files.create_index("subjectId")
    await db.tests.create_index("subjectId")
    await db.attempts.create_index("userId")


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await ensure_admin()
    await seed_data()
    logging.info("StudentHub startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# Mount router & CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
