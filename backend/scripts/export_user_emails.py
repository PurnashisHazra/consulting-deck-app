#!/usr/bin/env python3
"""
Simple script to export all user emails from the MongoDB `users` collection.
Usage:
  python backend/scripts/export_user_emails.py [--out FILE]
If --out is provided, writes JSON array of emails to the file, otherwise prints to stdout.

This script uses MONGO_URI from environment or the same default as the app.
"""
import os
import argparse
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv('MONGO_URI', "mongodb+srv://lobrockyl:Moyyn123@consultdg.ocafbf0.mongodb.net/?retryWrites=true&w=majority&appName=ConsultDG")
DB_NAME = os.getenv('MONGO_DB', 'consulting_deck')

async def fetch_emails(query=None):
    """Fetch emails matching an optional MongoDB query."""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database(DB_NAME)
    users = db.get_collection('users')
    # include coins in projection for debugging/validation if needed
    cursor = users.find(query or {}, {'email': 1, 'coins': 1})
    emails = []
    async for doc in cursor:
        email = doc.get('email')
        if email:
            emails.append(email)
    # AsyncIOMotorClient.close() is a synchronous call
    client.close()
    return emails

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--zero', action='store_true', help='Export emails of users with 0 coins (treat missing coins as 0)')
    group.add_argument('--lt10', action='store_true', help='Export emails of users with less than 10 coins (missing coins treated as 0)')
    parser.add_argument('--out', '-o', help='Output file (JSON)')
    args = parser.parse_args()

    # Build query based on flags
    query = None
    if args.zero:
        # coins == 0 or coins missing
        query = {'$or': [{'coins': 0}, {'coins': {'$exists': False}}]}
    elif args.lt10:
        # coins < 10 or coins missing
        query = {'$or': [{'coins': {'$lt': 10}}, {'coins': {'$exists': False}}]}

    emails = asyncio.run(fetch_emails(query=query))
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(emails, f, ensure_ascii=False, indent=2)
        print(f'Wrote {len(emails)} emails to {args.out}')
    else:
        print(json.dumps(emails, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
