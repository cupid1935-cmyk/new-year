# 팀 회식·송년회 조사 (Vercel)

## 배포 순서
1. 이 폴더를 GitHub에 올리거나, 폴더 안에서 `vercel` CLI로 배포합니다.
2. Vercel 프로젝트 → Storage(또는 Marketplace) → **Upstash Redis** 생성 후 프로젝트에 Connect
   (환경변수 KV_REST_API_URL / KV_REST_API_TOKEN 이 자동 등록됩니다)
3. 환경변수가 등록된 뒤 한 번 Redeploy 합니다.
4. 배포된 주소를 팀원에게 공유하면 끝입니다. (로그인 불필요)

## 참고
- 구조: public/index.html (화면) + api/data.js (저장 API)
- 날짜·체험 기본 후보를 바꾸려면 public/index.html 의 SETS, api/data.js 의 SEEDS 를 수정하세요.
- 로그인이 없어서 브라우저(기기)별로 한 명으로 취급해요. 팀 내부용으로 쓰는 것을 권장합니다.
