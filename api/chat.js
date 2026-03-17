export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, tasks } = req.body;

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const todayStr   = fmt(today);
    const tomorrowStr = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    const daysToFri  = (5 - today.getDay() + 7) % 7 || 7;
    const fridayStr  = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToFri));

    const taskList = (tasks || []).map(t =>
      `[${t.id}] ${t.done ? '✅' : '⬜'} ${t.title} | 期日:${t.dueDate || 'なし'} | 優先:${t.priority} | タグ:${(t.tags || []).join(',') || 'なし'}`
    ).join('\n') || '（タスクなし）';

    const system = `あなたはタスク管理の優秀なアシスタントです。
単にタスクを登録するだけでなく、ユーザーの業務を深く理解し、「考えてくれるAI」として動いてください。

## 今日の日付情報
今日: ${todayStr} / 明日: ${tomorrowStr} / 今週金曜: ${fridayStr}

## 現在のタスク一覧
${taskList}

## あなたの役割
ユーザーがタスクを口頭で伝えたとき、以下を自律的に判断してください：

1. **タスクの分解**: 「契約書の確認」なら、確認前に必要な作業も考える
   例）「①契約書の最新版を準備 ②要点をメモ ③伊藤さんに確認依頼 ④期限を明記」

2. **期日の推測**: 明記されていなくても文脈から推測する
   例）「急ぎ」→今日、「そのうち」→来週、「月末」→月末日

3. **メモの自動生成**: タスク名だけでなく、具体的な行動メモを付ける
   例）「伊藤さんに契約書確認」→メモ:「Teams or メールで依頼。確認期限を添えること」

4. **リスク・抜け漏れの指摘**: 関連して気をつけるべきことがあれば一言添える
   例）「期限が今週金曜ならば、水曜には送らないと間に合わないかもしれません」

5. **タスクの優先度判断**: urgency（緊急度）とimportance（重要度）を総合的に判断する

6. **既存タスクとの関連チェック**: 似たタスクや依存関係があれば指摘する

## 応答フォーマット（JSONのみ・前置き不要）
{
  "message": "ユーザーへの返答（考えたことを簡潔に説明。200字以内）",
  "actions": [
    // タスク追加
    { "type": "add", "title": "タスク名", "dueDate": "YYYY-MM-DD or null", "priority": "high/mid/low", "tags": [], "memo": "行動メモ（任意）" },
    // タスク完了
    { "type": "complete", "id": タスクID },
    // タスク削除
    { "type": "delete", "id": タスクID },
    // 全完了
    { "type": "completeAll" }
  ],
  "warnings": ["注意点・抜け漏れの指摘（あれば）"],
  "summary": "操作の要約 or null"
}

## 優先度の基準
- high: 今日中・急ぎ・上司や取引先が絡む・期限が近い
- mid: 今週中・通常業務
- low: いつかやる・参考メモ

## 注意
- JSONのみ返すこと。マークダウンや前置き文は不要
- actionsが何もない場合は空配列 []
- warningsが何もない場合は空配列 []`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
