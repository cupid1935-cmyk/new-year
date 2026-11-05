// Vercel Serverless Function — Upstash Redis(REST)에 팀 응답을 저장합니다.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const COLL = ["restaurants", "activities", "partyRestaurants"];
const SEEDS = ["🎳 볼링", "🎬 영화 관람", "🎭 뮤지컬", "🎻 연주회"];

async function cmd(cmds) {
  const r = await fetch(URL_ + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(cmds),
  });
  const j = await r.json();
  return j.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}
const toList = (arr) => {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += 2) {
    try { out.push({ ...JSON.parse(arr[i + 1]), id: arr[i] }); } catch {}
  }
  return out;
};
const readAll = () => cmd([
  ["SETNX", "td:seeded", "1"],
  ["HGETALL", "td:responses"], ["HGETALL", "td:restaurants"], ["HGETALL", "td:activities"],
  ["HGETALL", "td:restaurantsVotes"], ["HGETALL", "td:activitiesVotes"],
  ["HGETALL", "td:partyRestaurants"], ["HGETALL", "td:partyRestaurantsVotes"],
]);
async function state() {
  let r = await readAll();
  if (r[0] === 1) {
    await cmd(SEEDS.map((name, i) => ["HSET", "td:activities", "seed" + i,
      JSON.stringify({ name, by: "기본 제안", uid: "seed", at: i + 1 })]));
    r = await readAll();
  }
  return {
    responses: toList(r[1]), restaurants: toList(r[2]), activities: toList(r[3]),
    restaurantsVotes: toList(r[4]), activitiesVotes: toList(r[5]),
    partyRestaurants: toList(r[6]), partyRestaurantsVotes: toList(r[7]),
  };
}
const str = (s, n) => String(s || "").trim().slice(0, n);
const dates = (a) => (Array.isArray(a) ? a.map((x) => String(x).slice(0, 6)).slice(0, 40) : []);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!URL_ || !TOKEN) return res.status(500).json({ error: "Redis 환경변수가 설정되지 않았어요." });
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const uid = str(b.uid, 40);
      if (!uid) return res.status(400).json({ error: "uid required" });
      if (b.action === "save") {
        await cmd([["HSET", "td:responses", uid, JSON.stringify({
          name: str(b.name, 20), off: dates(b.off), offDec: dates(b.offDec), at: Date.now() })]]);
      } else if (b.action === "add" && COLL.includes(b.coll)) {
        const name = str(b.name, 40);
        if (name) {
          const id = "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          await cmd([["HSET", "td:" + b.coll, id, JSON.stringify({
            name, by: str(b.by, 20) || "익명", uid, at: Date.now() })]]);
        }
      } else if (b.action === "vote" && COLL.includes(b.coll)) {
        const ids = (Array.isArray(b.ids) ? b.ids : []).map((x) => String(x).slice(0, 40)).slice(0, 100);
        await cmd([["HSET", "td:" + b.coll + "Votes", uid, JSON.stringify({ ids })]]);
      } else if (b.action === "del" && COLL.includes(b.coll)) {
        const [v] = await cmd([["HGET", "td:" + b.coll, String(b.id)]]);
        if (v && JSON.parse(v).uid === uid) await cmd([["HDEL", "td:" + b.coll, String(b.id)]]);
      }
    }
    return res.status(200).json(await state());
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};
