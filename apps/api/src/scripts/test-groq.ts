import "dotenv/config";
import { groqClient, GROQ_MODEL, withGroqRetry } from "../services/embedder.service";

async function main() {
  console.log(`Testing Groq with model: ${GROQ_MODEL}`);
  console.log(`API key prefix: ${process.env.GROQ_API_KEY?.slice(0, 7)}...`);

  const start = Date.now();
  const res = await withGroqRetry(
    () =>
      groqClient.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You are a terse assistant. Reply in one sentence." },
          { role: "user", content: "Say 'Groq swap successful' and nothing else." },
        ],
        max_tokens: 30,
      }),
    "smoke-test",
  );

  const elapsed = Date.now() - start;
  const content = res.choices[0]?.message?.content ?? "(no content)";

  console.log(`\n✅ Response in ${elapsed}ms:`);
  console.log(`   ${content}`);
  console.log(`\n   tokens: ${res.usage?.total_tokens ?? "?"} (prompt ${res.usage?.prompt_tokens ?? "?"} + completion ${res.usage?.completion_tokens ?? "?"})`);
}

main().catch((err) => {
  console.error("\n❌ Groq test failed:");
  console.error(err);
  process.exit(1);
});
