from fastapi import Body
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.hash import sha256_crypt
import jwt as pyjwt
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()



# JWT secret key
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB Atlas connection
MONGO_URI = "mongodb+srv://lobrockyl:Moyyn123@consultdg.ocafbf0.mongodb.net/?retryWrites=true&w=majority&appName=ConsultDG"
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("consulting_deck")
users_collection = db.get_collection("users")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Utility functions

def get_password_hash(password):
    return sha256_crypt.hash(password)

def verify_password(plain_password, hashed_password):
    return sha256_crypt.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str):
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate):
    try:
        existing_user = await users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = get_password_hash(user.password)
        new_user = {"username": user.email ,"email": user.email, "password": hashed_password, "coins": 10}
        await users_collection.insert_one(new_user)
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/user")
async def get_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "name": user.get("email").split("@")[0].capitalize(),
            "coins": user.get("coins", 0)
        }
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/consume_coin")
async def consume_coin(token: str = Depends(oauth2_scheme), data: dict = Body(...)):
    try:
        num_slides = data.get("num_slides",1)
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        coins = user.get("coins", 0)
        if coins < num_slides:
            raise HTTPException(status_code=400, detail="Not enough coins")
        if coins <= 0:
            raise HTTPException(status_code=400, detail="No coins left")
        await users_collection.update_one({"email": email}, {"$inc": {"coins": -1*num_slides}})
        return {"success": True, "coins": coins - 1*num_slides}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/buy_coins")
async def buy_coins(data: dict):
    # data: {name, email, mobile, coins}
    
    return {"success": True}