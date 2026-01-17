import os
import subprocess
import requests

def get_repos(org):
    """Fetches all public repository clone URLs for a given organization."""
    url = f"https://api.github.com/orgs/{org}/repos"
    params = {"type": "public", "per_page": 100}
    repos = []
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        repos.extend([repo["clone_url"] for repo in response.json()])
        # Handle pagination if necessary (for > 100 repos)
        while "next" in response.links:
            response = requests.get(response.links["next"]["url"])
            repos.extend([repo["clone_url"] for repo in response.json()])
    else:
        print(f"Error fetching repos for {org}: {response.status_code}")
    
    return repos

def clone_repos(orgs, target_dir):
    """Clones all repos from the given organizations into the target directory."""
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created directory: {target_dir}")

    for org in orgs:
        print(f"\n--- Processing Organization: {org} ---")
        org_path = os.path.join(target_dir, org)
        if not os.path.exists(org_path):
            os.makedirs(org_path)
        
        repos = get_repos(org)
        print(f"Found {len(repos)} public repositories.")
        
        for repo_url in repos:
            repo_name = repo_url.split("/")[-1].replace(".git", "")
            dest_path = os.path.join(org_path, repo_name)
            
            if os.path.exists(dest_path):
                print(f"Skipping {repo_name} (already exists)")
                continue
            
            print(f"Cloning {repo_name}...")
            try:
                subprocess.run(["git", "clone", "--depth", "1", repo_url, dest_path], check=True)
            except subprocess.CalledProcessError as e:
                print(f"Failed to clone {repo_name}: {e}")

if __name__ == "__main__":
    TARGET_DIRECTORY = "external_resources"
    ORGANIZATIONS = ["flare-foundation", "ChaosChain"]
    
    clone_repos(ORGANIZATIONS, TARGET_DIRECTORY)
    print("\nResource integration complete.")
