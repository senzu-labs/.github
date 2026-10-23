import { expect, test } from "bun:test";

const workflow = Bun.YAML.parse(await Bun.file(".github/workflows/pr-description.yml").text());
const script = workflow.jobs.validate.steps[0].with.script;
const run = new Function("github", "context", "core", `return (async () => {${script}\n})();`);
const headings = ["Outcome", "Why", "Boundaries", "Risk", "Evidence", "Decisions"];
const valid = headings.map(name => `## ${name}\n\nContent for ${name}.`).join("\n\n");

async function validate(body: string | null, draft = false, number: number | null = 42) {
  const failures: string[] = [];
  await run(
    { rest: { pulls: { get: async () => ({ data: { body, draft } }) } } },
    { repo: { owner: "senzu-labs", repo: "fixture" }, payload: { pull_request: { number } } },
    { setFailed: (message: string) => failures.push(message), info: () => {} },
  );
  return failures;
}

test("valid bodies, None, and evidence code blocks pass", async () => {
  expect(await validate(valid)).toEqual([]);
  expect(await validate(valid.replace("Content for Decisions.", "None"))).toEqual([]);
  expect(await validate(valid.replace("Content for Evidence.", "```text\nbun test: passed\n```"))).toEqual([]);
});

test("missing and comment-only sections fail independently", async () => {
  expect(await validate(await Bun.file("pull_request_template.md").text())).toHaveLength(1);
  for (const name of headings) {
    expect(await validate(valid.replace(`## ${name}`, `## Other`))).toHaveLength(1);
    expect(await validate(valid.replace(`Content for ${name}.`, "<!-- fill this in -->"))).toHaveLength(1);
  }
  expect(await validate(null)).toHaveLength(1);
});

test("headings hidden in comments and fences cannot satisfy the check", async () => {
  expect(await validate(`<!--\n${valid}\n-->`)).toHaveLength(1);
  expect(await validate(`\`\`\`markdown\n${valid}\n\`\`\``)).toHaveLength(1);
  expect(await validate(`~~~markdown\n${valid}\n~~~`)).toHaveLength(1);
  expect(await validate(`${valid}\n## Outcome\nDuplicate`)).toHaveLength(1);
});

test("drafts defer, ready PRs validate, and missing PR context fails closed", async () => {
  expect(await validate(null, true)).toEqual([]);
  expect(await validate(null, false)).toHaveLength(1);
  expect(await validate(valid, false, null)).toHaveLength(1);
  expect(Bun.YAML.parse(await Bun.file(".github/workflows/pr-description-check.yml").text()).on.pull_request.types).toEqual(["opened", "edited", "synchronize", "reopened", "ready_for_review"]);
  expect(workflow.jobs.validate.if).toBe("github.event.pull_request.draft == false");
});
