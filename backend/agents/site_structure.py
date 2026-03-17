"""Site Structure Agent — discovers routes and pages via BFS crawling."""

import json
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from backend.services import firestore
from backend.services.gemini import generate_text


async def crawl_website(url: str, max_pages: int = 20) -> dict:
    """BFS crawl a website and return a structure map of discovered pages."""
    parsed_base = urlparse(url)
    base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
    visited: set[str] = set()
    queue: list[str] = [url]
    pages: list[dict] = []

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=15.0,
        headers={"User-Agent": "VisionQA-Bot/1.0"},
    ) as client:
        while queue and len(visited) < max_pages:
            current_url = queue.pop(0)
            normalized = current_url.split("#")[0].split("?")[0].rstrip("/")
            if normalized in visited:
                continue
            visited.add(normalized)

            try:
                resp = await client.get(current_url)
                if resp.status_code != 200:
                    pages.append({
                        "url": current_url,
                        "path": urlparse(current_url).path or "/",
                        "status": resp.status_code,
                        "title": None,
                        "links": [],
                    })
                    continue

                content_type = resp.headers.get("content-type", "")
                if "text/html" not in content_type:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                title_tag = soup.find("title")
                title = title_tag.get_text(strip=True) if title_tag else None

                # Extract all links on this page
                found_links: list[str] = []
                for a_tag in soup.find_all("a", href=True):
                    href = a_tag["href"]
                    absolute = urljoin(current_url, href)
                    abs_parsed = urlparse(absolute)
                    # Only follow same-domain links
                    if abs_parsed.netloc == parsed_base.netloc:
                        clean = f"{abs_parsed.scheme}://{abs_parsed.netloc}{abs_parsed.path}".rstrip("/")
                        found_links.append(clean)
                        if clean not in visited:
                            queue.append(clean)

                pages.append({
                    "url": current_url,
                    "path": urlparse(current_url).path or "/",
                    "status": resp.status_code,
                    "title": title,
                    "links": list(set(found_links)),
                })

            except Exception as e:
                import traceback
                traceback.print_exc()
                pages.append({
                    "url": current_url,
                    "path": urlparse(current_url).path or "/",
                    "status": 0,
                    "title": None,
                    "links": [],
                    "error": f"Request failed: {str(e)}",
                })

    return {
        "base_url": url,
        "total_pages": len(pages),
        "pages": pages,
    }


async def run(session_id: str, url: str) -> dict:
    """Execute the Site Structure Agent for a session."""
    await firestore.update_session(session_id, status="crawling")

    structure = await crawl_website(url)

    # Use Gemini to summarize the site structure
    summary_prompt = f"""Analyze this website structure map and provide a brief summary:

{json.dumps(structure, indent=2)}

Respond with a JSON object containing:
- "summary": a 2-3 sentence description of the site
- "key_flows": array of main user flows you can identify (e.g. "login flow", "checkout flow")
- "total_routes": number of unique routes found
"""
    try:
        summary_text = await generate_text(
            summary_prompt,
            system_instruction="You are a QA engineer analyzing website structure. Respond only with valid JSON.",
        )
        # Try to parse the summary
        summary_text = summary_text.strip()
        if summary_text.startswith("```"):
            summary_text = summary_text.split("\n", 1)[1].rsplit("```", 1)[0]
        summary = json.loads(summary_text)
        structure["analysis"] = summary
    except (json.JSONDecodeError, Exception) as e:
        import traceback
        traceback.print_exc()
        raise e

    await firestore.update_session(session_id, site_structure=structure, status="analyzing")
    return structure
