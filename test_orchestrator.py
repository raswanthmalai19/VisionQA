import asyncio
from backend.services.firestore import create_user, create_session
from backend.agents.orchestrator import run_orchestrator

async def main():
    print("Creating test user...")
    user = await create_user("test_backend@visionqa.dev", "hash", "sk-test")
    user_id = user["user_id"]
    
    print("Creating test session for example.com...")
    session = await create_session(user_id, "https://example.com", "Test the main heading")
    session_id = session["session_id"]
    
    print(f"Running orchestrator for session {session_id}...")
    try:
        await run_orchestrator(session_id)
        print("Orchestrator finished successfully!")
    except Exception as e:
        import traceback
        print("Orchestrator failed:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
