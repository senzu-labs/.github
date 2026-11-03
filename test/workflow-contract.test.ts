import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";

test("every owned Linux job uses the caller variable and reusable callers own no runner", async () => {
  const directory = new URL("../.github/workflows/", import.meta.url);
  const files = readdirSync(directory).filter((file) => /\.ya?ml$/.test(file));
  let ownedJobs = 0;
  let callers = 0;

  for (const file of files) {
    const workflow: unknown = Bun.YAML.parse(await Bun.file(new URL(file, directory)).text());
    expect(workflow).toBeObject();
    if (typeof workflow !== "object" || workflow === null || !("jobs" in workflow)) {
      throw new Error(`Missing jobs: ${file}`);
    }
    const jobs = workflow.jobs;
    if (typeof jobs !== "object" || jobs === null) {
      throw new Error(`Invalid jobs: ${file}`);
    }
    for (const [name, value] of Object.entries(jobs)) {
      const job: unknown = value;
      if (typeof job !== "object" || job === null) {
        throw new Error(`Invalid job: ${file}/${name}`);
      }
      if ("uses" in job) {
        expect(job).not.toHaveProperty("runs-on");
        callers++;
      } else {
        expect(job).toHaveProperty("runs-on", "${{ vars.CI_LINUX_RUNNER || 'ubuntu-latest' }}");
        ownedJobs++;
      }
    }
  }

  expect(ownedJobs).toBeGreaterThan(0);
  expect(callers).toBeGreaterThan(0);
});
