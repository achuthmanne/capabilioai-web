const key = process.env.ANTHROPIC_API_KEY;

async function run() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 10,
      system: "You are a JSON API",
      messages: [{ role: "user", content: "Hi" }]
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
