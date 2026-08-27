const key = process.env.ANTHROPIC_API_KEY;
const models = [
  "claude-3-7-sonnet-latest",
  "claude-3-5-sonnet-20240620",
  "claude-3-7-sonnet-20250219",
  "claude-sonnet-5",
  "claude-5-sonnet-latest"
];

async function run() {
  for (const model of models) {
      console.log("Testing:", model);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }]
        })
      });
      console.log(response.status);
      if (response.status === 200) {
        console.log("SUCCESS:", model);
        return;
      }
  }
}
run();
