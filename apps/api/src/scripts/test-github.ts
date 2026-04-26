import "dotenv/config";
import { fetchRepoFiles } from "../lib/fetchRepoFiles";

async function main() {
  console.log("Fetching sindresorhus/is ...\n");

  const result = await fetchRepoFiles("sindresorhus", "is", "main");

  console.log("=== Repo Info ===");
  console.log(`Owner:          ${result.owner}`);
  console.log(`Repo:           ${result.repoName}`);
  console.log(`Branch:         ${result.defaultBranch}`);
  console.log(`Description:    ${result.description}`);
  console.log(`Private:        ${result.isPrivate}`);
  console.log(`Files found:    ${result.totalFilesFound}`);
  console.log(`Files fetched:  ${result.totalFilesFetched}`);

  console.log("\n=== Sample Files (first 5) ===");
  for (const file of result.files.slice(0, 5)) {
    console.log(`\n[${file.language}] ${file.path} (${file.size} bytes)`);
    console.log(file.content.slice(0, 200) + (file.content.length > 200 ? " ..." : ""));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
