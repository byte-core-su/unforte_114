const {onCall,HttpsError}=require("firebase-functions/v2/https");
const admin=require("firebase-admin");
admin.initializeApp();
const db=admin.firestore();
const REGION="asia-east1",TOTAL=26;
const LEVELS=[{"id": "p1", "title": "第 1 關｜哈囉，旅伴！", "rules": ["p1_greeting", "p1_two_distinct"]}, {"id": "p2", "title": "第 2 關｜畢旅報名表", "rules": ["p2_one_input_var", "p2_two_inputs", "p2_three_inputs_print"]}, {"id": "p3", "title": "第 3 關｜旅費計算器", "rules": ["p3_multiply_int", "p3_divmod", "p3_budget"]}, {"id": "p4", "title": "第 4 關｜旅行數字工具", "rules": ["p4_square", "p4_speed"]}, {"id": "p5", "title": "第 5 關｜條件判斷", "rules": ["p5_pass", "p5_rain", "p5_custom_threshold"]}, {"id": "p6", "title": "第 6 關｜多重選擇", "rules": ["p6_age3", "p6_temp4"]}, {"id": "p7", "title": "第 7 關｜雙重條件", "rules": ["p7_and", "p7_or"]}, {"id": "p8", "title": "第 8 關｜規律重複", "rules": ["p8_1to5", "p8_countdown", "p8_even"]}, {"id": "p9", "title": "第 9 關｜條件式重複", "rules": ["p9_count5", "p9_password", "p9_password_hint"]}, {"id": "p10", "title": "第 10 關｜魔王關：猜數字", "rules": ["p10_random10", "p10_guess20", "p10_boss"]}];
const NEEDS={"p1": 2, "p2": 3, "p3": 3, "p4": 2, "p5": 3, "p6": 2, "p7": 2, "p8": 3, "p9": 3, "p10": 3};

function normSeat(v){return String(Number(String(v||"").trim()));}
function studentEmail(cls,seat){return `python1151-${String(cls||"").trim()}-${String(Number(seat)).padStart(2,"0")}@student.course115.local`;}
function validProfile(p){return /^[1-9][0-9]{2}$/.test(String(p.className||"").trim())&&/^(?:[1-9]|[1-9][0-9])$/.test(normSeat(p.seatNo))&&String(p.name||"").trim().length>=2;}
function clampProgress(p){const out={};for(const [id,max] of Object.entries(NEEDS)){const n=Number(p?.[id]||0);out[id]=Math.max(0,Math.min(max,Number.isFinite(n)?n:0));}return out;}
function starsOf(p){return Object.values(clampProgress(p)).reduce((a,b)=>a+b,0);}
function currentPos(p){const q=clampProgress(p);for(const l of LEVELS){const done=q[l.id]||0;if(done<NEEDS[l.id])return {level:l,challenge:done+1,done:false};}return {level:LEVELS.at(-1),challenge:NEEDS.p10,done:true};}
function nextFields(progress){const p=clampProgress(progress),stars=starsOf(p),pos=currentPos(p);return {stars,totalStars:TOTAL,score:Math.round(stars/TOTAL*100),progress:p,completed:stars===TOTAL,certificateUnlocked:stars===TOTAL,currentStation:stars===TOTAL?"完成":pos.level.title,currentChallenge:stars===TOTAL?0:pos.challenge};}

function countRx(code,rx){return (code.match(rx)||[]).length}

function printedLiterals(code){
  let out=[],m,rx=/print\s*\(\s*["']([^"']*)["']\s*\)/g;
  while((m=rx.exec(code))!==null) out.push(m[1].trim());
  return out;
}

function inputVars(code){
  let out=[],lines=code.split(/\n/);
  for(const line of lines){
    let m=line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(?:(?:int|float)\s*\(\s*)?input\s*\(/);
    if(m) out.push(m[1]);
  }
  return [...new Set(out)];
}

function outputUsesVars(code,vars,min=1){
  const prints=[...code.matchAll(/print\s*\(([^)]*)\)/g)].map(m=>m[1]);
  const used=new Set();
  for(const v of vars) if(prints.some(p=>new RegExp("\\b"+v+"\\b").test(p))) used.add(v);
  return used.size>=min;
}

function hasDistinctBranchStrings(code,min=2){
  const arr=printedLiterals(code);
  return new Set(arr).size>=min;
}

function fail(msg){return {ok:false,msg}}

function ok(){return {ok:true,msg:""}}

function inputPromptLiterals(code){
  const out=[];
  const rx=/input\s*\(\s*(["'])(.*?)\1\s*\)/g;
  let m;
  while((m=rx.exec(String(code||"")))!==null) out.push(m[2].trim());
  return out;
}

function meaningfulPrompt(text,kind){
  const x=String(text||"").trim();
  if(x.length<2 || looksLikeGibberish(x)) return false;
  const groups={
    place:["城市","地點","地方","目的地","想去","哪裡","where","city","destination"],
    name:["姓名","名字","name"],
    className:["班級","class"],
    days:["天數","幾天","days","day"],
    activity:["活動","事情","想做","期待","activity"]
  };
  const words=groups[kind]||[];
  const lower=x.toLowerCase();
  return words.some(w=>lower.includes(String(w).toLowerCase()));
}

function looksLikePlace(v){
  const x=cleanAnswer(v);
  if(x.length<2 || looksLikeGibberish(x)) return false;
  if(OBVIOUS_NON_PLACE.some(w=>x===w||x.includes(w))) return false;
  if(PLACE_WORDS.some(w=>x.toLowerCase().includes(String(w).toLowerCase()))) return true;
  if(/[市縣區鄉鎮村國島山湖海港站館園機場樂園景區校園夜市老街]$/.test(x)) return true;
  return false;
}

function looksLikeActivity(v){
  const x=cleanAnswer(v);
  if(x.length<2 || looksLikeGibberish(x)) return false;
  if(OBVIOUS_NON_PLACE.some(w=>x===w)) return false;
  if(ACTIVITY_WORDS.some(w=>x.includes(w))) return true;
  if(ENGLISH_ACTIVITY_WORDS.some(w=>x.toLowerCase().includes(w))) return true;
  // 中文活動通常包含動作詞；避免任意名詞或亂碼直接過關。
  if(/[去看吃玩逛拍買游泳爬登騎搭坐泡參觀賞唱走跑露營滑潛衝]/.test(x) &&
     /[\u3400-\u9FFF]/.test(x)) return true;
  return false;
}

function validate(code,step){
  const n=code.toLowerCase(), rule=step.rule;
  switch(rule){
    case "p1_greeting":{
      let p=printedLiterals(code), d=printedLiterals(step.demo);
      if(countRx(n,/print\s*\(/g)<1) return fail("還沒有使用 print()。");
      if(!p.length || p.every(x=>x.length<2)) return fail("招呼語需要有實際文字內容。");
      if(d.length && p.some(x=>d.includes(x))) return fail("目前文字和黑框示範相同，請改成自己的招呼語。");
      return ok();
    }
    case "p1_two_distinct":{
      let p=printedLiterals(code);
      if(countRx(n,/print\s*\(/g)<2) return fail("題目要求顯示兩行，所以需要 2 次 print()。");
      if(p.length<2 || p.some(x=>x.length<2)) return fail("兩行都要有實際文字內容。");
      if(new Set(p.slice(0,2)).size<2) return fail("兩行內容目前相同；第一行是地點，第二行是活動，請寫成不同內容。");
      const place=p[0], activity=p[1];
      if(!looksLikePlace(place))
        return fail(`第一行「${place}」不像實際地點。請輸入例如「高雄」、「台北」、「東京」等想去的地方。`);
      if(!looksLikeActivity(activity))
        return fail(`第二行「${activity}」不像旅行活動。請寫例如「拍照」、「逛夜市」、「看風景」等想做的事情。`);
      return ok();
    }
    case "p2_one_input_var":{
      let vars=inputVars(code);
      if(countRx(n,/input\s*\(/g)<1) return fail("還沒有使用 input() 詢問資料。");
      if(vars.length<1) return fail("需要把 input() 的回答存進變數。");
      if(!outputUsesVars(code,vars,1)) return fail("最後要用 print() 顯示剛才保存的變數。");
      const prompts=inputPromptLiterals(code);
      if(!prompts.length || !meaningfulPrompt(prompts[0],"place"))
        return fail("input() 裡的提示要清楚詢問城市／地點／目的地，不要用 ddddd 這類無意義文字。");
      return ok();
    }
    case "p2_two_inputs":{
      let vars=inputVars(code);
      if(countRx(n,/input\s*\(/g)<2) return fail("題目要求詢問姓名和班級兩項資料，需要 2 次 input()。");
      if(vars.length<2) return fail("兩項回答要放進 2 個不同變數。");
      if(!outputUsesVars(code,vars,2)) return fail("最後要把兩項資料都顯示出來。");
      const prompts=inputPromptLiterals(code);
      if(prompts.length<2) return fail("兩次 input() 都要有清楚的提示文字。");
      if(!meaningfulPrompt(prompts[0],"name")) return fail("第一個 input() 的提示要清楚詢問姓名。");
      if(!meaningfulPrompt(prompts[1],"className")) return fail("第二個 input() 的提示要清楚詢問班級。");
      return ok();
    }
    case "p2_three_inputs_print":{
      let vars=inputVars(code);
      if(countRx(n,/input\s*\(/g)<3) return fail("題目要求目的地、天數、活動三項資料，需要 3 次 input()。");
      if(vars.length<3) return fail("三項回答要分別存進 3 個不同變數。");
      if(!outputUsesVars(code,vars,3)) return fail("輸出時還沒有使用到全部 3 個變數。");
      const prompts=inputPromptLiterals(code);
      if(prompts.length<3) return fail("三次 input() 都要有清楚的提示文字。");
      if(!meaningfulPrompt(prompts[0],"place")) return fail("第一個 input() 要清楚詢問目的地。");
      if(!meaningfulPrompt(prompts[1],"days")) return fail("第二個 input() 要清楚詢問旅行天數。");
      if(!meaningfulPrompt(prompts[2],"activity")) return fail("第三個 input() 要清楚詢問想做的活動。");
      return ok();
    }
    case "p3_multiply_int":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<2) return fail("票價和張數兩次輸入都要用 int() 轉成整數。");
      if(!n.includes("*")) return fail("總額需要使用乘法 *。");
      if(countRx(n,/print\s*\(/g)<1) return fail("要把計算結果顯示出來。");
      return ok();
    case "p3_divmod":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<2) return fail("總數和人數都要使用 int(input())。");
      if(!n.includes("//")) return fail("還沒有使用 // 計算每人可以拿幾個。");
      if(!n.includes("%")) return fail("還沒有使用 % 計算最後剩幾個。");
      if(countRx(n,/print\s*\(/g)<2) return fail("每人數量和剩餘數量都要顯示。");
      return ok();
    case "p3_budget":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<3) return fail("總預算、交通費、餐費都要使用 int(input())。");
      if(countRx(n,/-/g)<2) return fail("要從總預算扣掉兩筆費用，需要完成兩次減法。");
      if(countRx(n,/print\s*\(/g)<1) return fail("最後要顯示剩餘預算。");
      return ok();
    case "p4_square":
      if(countRx(n,/float\s*\(\s*input\s*\(/g)<1) return fail("邊長可能有小數，需要 float(input())。");
      if(!/\*\*\s*2/.test(n)) return fail("面積需要使用 ** 2 計算平方。");
      if(!/round\s*\([^,\n]+,\s*2\s*\)/.test(n)) return fail("結果需要用 round(..., 2) 整理到小數第 2 位。");
      if(countRx(n,/print\s*\(/g)<1) return fail("最後要顯示面積。");
      return ok();
    case "p4_speed":
      if(countRx(n,/float\s*\(\s*input\s*\(/g)<2) return fail("距離和時間兩次輸入都需要 float()。");
      if(!n.includes("/")) return fail("平均速度需要使用除法 /。");
      if(!/round\s*\([^,\n]+,\s*1\s*\)/.test(n)) return fail("結果需要用 round(..., 1) 整理到小數第 1 位。");
      if(countRx(n,/print\s*\(/g)<1) return fail("最後要顯示平均速度。");
      return ok();
    case "p5_pass":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("先用 int(input()) 取得分數。");
      if(!/\bif\b/.test(n)||!/\belse\b/.test(n)) return fail("需要使用 if 和 else 形成兩個分支。");
      if(!/[<>]=?\s*60|60\s*[<>]=?/.test(n)) return fail("條件中還沒有使用 60 作為分界。");
      if(countRx(n,/print\s*\(/g)<2) return fail("兩個分支都要有輸出。");
      return ok();
    case "p5_rain":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("先用 int(input()) 取得降雨機率。");
      if(!/\bif\b/.test(n)||!/\belse\b/.test(n)) return fail("需要使用 if / else。");
      if(!/(>=\s*50|50\s*<=)/.test(n)) return fail("題目指定以 >= 50 作為判斷。");
      if(countRx(n,/print\s*\(/g)<2) return fail("兩個分支都要有輸出。");
      return ok();
    case "p5_custom_threshold":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("要先詢問一個整數。");
      if(!/\bif\b/.test(n)||!/\belse\b/.test(n)) return fail("需要使用 if / else。");
      if(!/(>=|<=|==|!=|>|<)/.test(n)) return fail("if 條件中要有比較運算。");
      if(!hasDistinctBranchStrings(code,2)) return fail("兩個結果的輸出文字要不同。");
      return ok();
    case "p6_age3":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("先用 int(input()) 取得年齡。");
      if(!/\bif\b/.test(n)||countRx(n,/\belif\b/g)<1||!/\belse\b/.test(n)) return fail("三種結果需要 if、elif、else。");
      if(!n.includes("6")||!n.includes("18")) return fail("條件中需要使用 6 和 18 作為分界。");
      if(countRx(n,/print\s*\(/g)<3) return fail("三個分支都要有輸出。");
      return ok();
    case "p6_temp4":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("先用 int(input()) 取得氣溫。");
      if(!/\bif\b/.test(n)||countRx(n,/\belif\b/g)<2||!/\belse\b/.test(n)) return fail("四種結果需要 if、至少 2 個 elif、else。");
      if(!["15","25","32"].every(x=>n.includes(x))) return fail("條件中需要使用 15、25、32 三個分界。");
      if(countRx(n,/print\s*\(/g)<4) return fail("四個分支都要有輸出。");
      return ok();
    case "p7_and":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<2) return fail("需要取得兩個整數輸入。");
      if(!/\band\b/.test(n)) return fail("題目要求兩個條件都成立，需要使用 and。");
      if(!/\bif\b/.test(n)||!/\belse\b/.test(n)) return fail("需要使用 if / else。");
      return ok();
    case "p7_or":
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<2) return fail("需要取得兩個整數輸入。");
      if(!/\bor\b/.test(n)) return fail("題目要求其中一個成立即可，需要使用 or。");
      if(!/\bif\b/.test(n)||!/\belse\b/.test(n)) return fail("需要使用 if / else。");
      return ok();
    case "p8_1to5":
      if(!/\bfor\b/.test(n)||!/\brange\s*\(/.test(n)) return fail("需要使用 for + range()。");
      if(!/range\s*\(\s*1\s*,\s*6\s*\)/.test(n)) return fail("要顯示 1～5，可以讓 range() 從 1 走到 6 前停止。");
      if(countRx(n,/print\s*\(/g)<1) return fail("迴圈裡要把數字顯示出來。");
      return ok();
    case "p8_countdown":
      if(!/\bfor\b/.test(n)||!/\brange\s*\(/.test(n)) return fail("需要使用 for + range()。");
      if(!/range\s*\(\s*5\s*,\s*0\s*,\s*-1\s*\)/.test(n)) return fail("倒數 5～1 時，range() 應使用 5、0、-1。");
      if(!/print\s*\(\s*["']出發！?["']\s*\)/.test(code)) return fail("迴圈結束後還要顯示「出發！」。");
      return ok();
    case "p8_even":
      if(!/\bfor\b/.test(n)||!/\brange\s*\(/.test(n)) return fail("需要使用 for + range()。");
      if(!/range\s*\(\s*2\s*,\s*11\s*,\s*2\s*\)/.test(n)) return fail("顯示 2、4、6、8、10 時，range() 可使用 2、11、2。");
      if(countRx(n,/print\s*\(/g)>2) return fail("這題要利用迴圈規律，不要寫 5 個獨立 print()。");
      return ok();
    case "p9_count5":
      if(!/\bwhile\b/.test(n)) return fail("這題要求使用 while。");
      if(!/=\s*1\b/.test(n)) return fail("計數要從 1 開始。");
      if(!/(<=\s*5|<\s*6)/.test(n)) return fail("while 條件要讓 5 也被執行。");
      if(!/(\+=\s*1|=\s*\w+\s*\+\s*1)/.test(n)) return fail("每輪都要更新計數變數，否則可能無限重複。");
      return ok();
    case "p9_password":
      if(!/\bwhile\b/.test(n)) return fail("密碼不正確時要繼續詢問，需要 while。");
      if(countRx(n,/int\s*\(\s*input\s*\(/g)<1) return fail("while 中要取得整數密碼輸入。");
      if(!/!=/.test(n)) return fail("可以用 != 表示『還沒猜中』。");
      if(!/print\s*\(\s*["']解鎖！?["']\s*\)/.test(code)) return fail("答對後要顯示「解鎖！」。");
      let nums=[...code.matchAll(/\b(\d{4})\b/g)].map(m=>m[1]);
      if(!nums.length) return fail("請先設定一個四位數整數答案。");
      return ok();
    case "p9_password_hint":
      if(!/\bwhile\b/.test(n)) return fail("需要使用 while。");
      if(!/\bif\b/.test(n)||!/\belif\b/.test(n)) return fail("太大／太小提示需要 if 和 elif。");
      if(!n.includes(">")||!n.includes("<")) return fail("大小提示需要同時比較 > 和 <。");
      if(!/print\s*\(\s*["']解鎖！?["']\s*\)/.test(code)) return fail("答對後要顯示「解鎖！」。");
      return ok();
    case "p10_random10":
      if(!/import\s+random/.test(n)) return fail("要先 import random。");
      if(!/random\.randint\s*\(\s*1\s*,\s*10\s*\)/.test(n)) return fail("隨機範圍要設定為 1～10。");
      if(countRx(n,/print\s*\(/g)<1) return fail("要顯示產生的隨機數。");
      return ok();
    case "p10_guess20":
      if(!/random\.randint\s*\(\s*1\s*,\s*20\s*\)/.test(n)) return fail("隨機答案範圍要是 1～20。");
      if(!/\bwhile\b/.test(n)) return fail("要使用 while 讓玩家持續猜。");
      if(!/\bif\b/.test(n)||!/\belif\b/.test(n)) return fail("要使用 if / elif 提示太大或太小。");
      if(!n.includes(">")||!n.includes("<")) return fail("大小提示要比較 > 和 <。");
      return ok();
    case "p10_boss":
      if(!/random\.randint\s*\(\s*1\s*,\s*100\s*\)/.test(n)) return fail("魔王關的隨機答案範圍要是 1～100。");
      if(!/\bwhile\b/.test(n)) return fail("需要 while 讓玩家猜到正確為止。");
      if(!/\bif\b/.test(n)||!/\belif\b/.test(n)) return fail("需要 if / elif 做太大、太小提示。");
      if(!/(\+=\s*1|=\s*\w+\s*\+\s*1)/.test(n)) return fail("還沒有看到『每猜一次，計次變數增加 1』。");
      let vars=[...code.matchAll(/^\s*([A-Za-z_]\w*)\s*=\s*0\s*$/gm)].map(m=>m[1]);
      if(!vars.length) return fail("需要一個從 0 開始的計次變數。");
      if(!outputUsesVars(code,vars,1)) return fail("答對後要把猜測次數顯示出來。");
      return ok();
  }
  return fail("這題的驗證規則尚未設定。");
}

function stepFor(levelId,challenge){
  const l=LEVELS.find(x=>x.id===levelId),idx=Number(challenge)-1;
  if(!l||idx<0||idx>=l.rules.length)return null;
  return {level:l,index:idx,rule:l.rules[idx],demo:(levelId==="p1"&&idx===0)?'print("哈囉，旅伴！")':""};
}
async function getTeacher(uid){const s=await db.doc(`teachers/${uid}`).get();return s.exists?s.data():null;}
function canTeach(t,cls){return t?.role==="admin"||(t?.role==="teacher"&&Array.isArray(t.classes)&&t.classes.map(String).includes(String(cls)));}

exports.registerPythonStudent=onCall({region:REGION},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","請先登入學習帳號。");
  const p=req.data||{};if(!validProfile(p))throw new HttpsError("invalid-argument","班級、座號或姓名格式不正確。");
  const ref=db.doc(`students/${req.auth.uid}`);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),old=snap.exists?snap.data():{},progress=clampProgress(old.progress||{});
    tx.set(ref,{...nextFields(progress),uid:req.auth.uid,className:String(p.className).trim(),seatNo:normSeat(p.seatNo),name:String(p.name).trim(),courseId:"python",updatedAt:admin.firestore.FieldValue.serverTimestamp(),lastSeenAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  });
  return {ok:true};
});

exports.verifyPythonChallenge=onCall({region:REGION,timeoutSeconds:30},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","請先登入學習帳號。");
  const d=req.data||{},code=String(d.code||""),step=stepFor(String(d.levelId||""),Number(d.challenge||0));
  if(!step)throw new HttpsError("invalid-argument","找不到這個挑戰。");
  if(code.length<1||code.length>12000)throw new HttpsError("invalid-argument","程式碼長度不正確。");
  const chk=validate(code,{rule:step.rule,demo:step.demo});
  if(!chk.ok)throw new HttpsError("failed-precondition",chk.msg||"程式碼尚未符合挑戰條件。");
  const ref=db.doc(`students/${req.auth.uid}`);let result;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError("failed-precondition","尚未建立正式學習帳號紀錄。");
    const old=snap.data(),progress=clampProgress(old.progress||{}),expected=currentPos(progress);
    if(expected.done){result=nextFields(progress);return;}
    if(expected.level.id!==step.level.id||expected.challenge!==Number(d.challenge))throw new HttpsError("failed-precondition",`目前正式進度應在 ${expected.level.id.toUpperCase()} 第 ${expected.challenge} 題。`);
    progress[step.level.id]=Number(d.challenge);result=nextFields(progress);
    tx.set(ref,{...result,lastVerifiedRule:step.rule,lastVerifiedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp(),lastSeenAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  });
  return {ok:true,...result};
});

exports.inspectLegacyStudent=onCall({region:REGION},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","請先登入教師帳號。");
  const t=await getTeacher(req.auth.uid),d=req.data||{},cls=String(d.className||"").trim(),seat=normSeat(d.seatNo);
  if(!canTeach(t,cls))throw new HttpsError("permission-denied","沒有這個班級的權限。");
  const snap=await db.collection("students").where("className","==",cls).get();
  const rows=snap.docs.filter(x=>normSeat(x.data().seatNo)===seat).map(x=>{const v=x.data();return {id:x.id,name:v.name||"",stars:Number(v.stars||0),progress:clampProgress(v.progress||{})};});
  let authExists=false;try{await admin.auth().getUserByEmail(studentEmail(cls,seat));authExists=true;}catch(e){if(e.code!=="auth/user-not-found")throw e;}
  return {ok:true,rows,authExists,email:studentEmail(cls,seat)};
});

exports.teacherRescueStudentAccount=onCall({region:REGION,timeoutSeconds:30},async req=>{
  if(!req.auth)throw new HttpsError("unauthenticated","請先登入教師帳號。");
  const t=await getTeacher(req.auth.uid),d=req.data||{},cls=String(d.className||"").trim(),seat=normSeat(d.seatNo),name=String(d.name||"").trim(),pw=String(d.newPassword||"");
  if(!canTeach(t,cls))throw new HttpsError("permission-denied","沒有這個班級的管理權限。");
  if(!/^[1-9][0-9]{2}$/.test(cls)||!/^(?:[1-9]|[1-9][0-9])$/.test(seat)||name.length<2||pw.length<6)throw new HttpsError("invalid-argument","資料格式不正確。");
  const snap=await db.collection("students").where("className","==",cls).get();
  const docs=snap.docs.filter(x=>normSeat(x.data().seatNo)===seat&&String(x.data().name||"").trim()===name);
  if(!docs.length)throw new HttpsError("not-found","找不到符合班級、座號、姓名的舊紀錄。");
  const email=studentEmail(cls,seat);let user;
  try{user=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(user.uid,{password:pw});}
  catch(e){if(e.code==="auth/user-not-found")user=await admin.auth().createUser({email,password:pw,displayName:name});else throw e;}
  const merged={};for(const doc of docs){for(const [id,n] of Object.entries(clampProgress(doc.data().progress||{})))merged[id]=Math.max(Number(merged[id]||0),Number(n||0));}
  const fields=nextFields(merged);
  await db.doc(`students/${user.uid}`).set({...fields,uid:user.uid,className:cls,seatNo:seat,name,courseId:"python",migratedFromLegacy:true,migratedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp(),lastSeenAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  const batch=db.batch();for(const doc of docs)if(doc.id!==user.uid)batch.delete(doc.ref);await batch.commit();
  return {ok:true,email,mergedStars:fields.stars,recordsMerged:docs.length};
});
