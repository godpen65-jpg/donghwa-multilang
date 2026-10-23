// 품사 놀이터 낱말·문장 데이터 (parts-of-speech.html, parts-of-speech-print.html 같이 씀)
// ── 낱말 가족 넷 ──────────────────────────────
const P = {
  n:{ko:'명사', en:'Noun',      kid:'이름 말',   old:'이름씨', em:'🏷️',
     desc:'사람, 동물, 물건, 장소의 <b>이름</b>이에요.', descEn:'A noun is a name of a person, animal, thing or place.',
     q:'무엇? 누구?', qen:'What? Who?',
     tip:'"이게 뭐야?" 하고 물었을 때 대답이 되는 말이에요.'},
  v:{ko:'동사', en:'Verb',      kid:'움직임 말', old:'움직씨', em:'🏃',
     desc:'몸을 움직이거나 <b>무엇을 하는지</b> 알려줘요.', descEn:'A verb is an action word.',
     q:'무엇을 해요?', qen:'What does it do?',
     tip:'"같이 ○○자!" 가 말이 되면 움직임 말이에요!'},
  a:{ko:'형용사', en:'Adjective', kid:'어떤지 말', old:'그림씨', em:'🎨',
     desc:'모양, 색깔, 크기, 맛, 기분이 <b>어떤지</b> 알려줘요.', descEn:'An adjective tells what something is like.',
     q:'어때요? 어떤?', qen:'What is it like?',
     tip:'"어때?"에 대답하는 말. "같이 ○○자!"는 이상해요.'},
  d:{ko:'부사', en:'Adverb',    kid:'어떻게 말', old:'어찌씨', em:'💨',
     desc:'움직임 말 앞에서 <b>어떻게, 얼마나</b> 하는지 알려줘요.', descEn:'An adverb tells how we do something.',
     q:'어떻게? 얼마나?', qen:'How?',
     tip:'"어떻게 달려?" → "빨리!" 처럼 대답하는 말이에요.'}
};
const ORDER = ['n','v','a','d'];

// 문장 속 위치 힌트 (아이가 막혔을 때)
const WHERE = {
  n:{ko:'"가, 이, 을, 를" 꼬리가 붙은 말을 찾아 봐요.', en:'the, a, my 바로 뒤에 있을 때가 많아요. (the → dog)'},
  v:{ko:'한국어 움직임 말은 문장 <b>맨 끝</b>에 있어요! "-요"로 끝나요.', en:'영어 움직임 말은 이름 말 <b>바로 뒤</b>에 와요. (dog → runs)'},
  a:{ko:'이름 말 <b>바로 앞</b>에서 "어떤?"을 알려줘요. (귀여운 → 고양이)', en:'이름 말 <b>바로 앞</b>에 와요. (cute → cat)'},
  d:{ko:'움직임 말 <b>바로 앞</b>에 있어요. (빨리 → 달려요)', en:'영어에서는 문장 <b>맨 끝</b>에 올 때가 많아요. (runs → quickly)'}
};

// ── 낱말 바구니 [그림, 한국어, 영어, 문장 속 모양] ──
const WORDS = {
  n:[['🐶','강아지','dog'],['🐱','고양이','cat'],['🍎','사과','apple'],['🏫','학교','school'],['👩','엄마','mom'],
     ['🌸','꽃','flower'],['📖','책','book'],['⚽','공','ball'],['🌳','나무','tree'],['💧','물','water'],
     ['🚗','자동차','car'],['☀️','해','sun'],['🐰','토끼','rabbit'],['🏠','집','house']],
  v:[['🏃','달리다','run','달려요'],['🍽️','먹다','eat','먹어요'],['😴','자다','sleep','자요'],['📚','읽다','read','읽어요'],
     ['🎤','노래하다','sing','노래해요'],['😄','웃다','laugh','웃어요'],['😭','울다','cry','울어요'],['🤸','뛰다','jump','뛰어요'],
     ['🏊','수영하다','swim','수영해요'],['✏️','쓰다','write','써요'],['🥤','마시다','drink','마셔요'],['💃','춤추다','dance','춤춰요'],
     ['🚶','걷다','walk','걸어요'],['🖍️','그리다','draw','그려요']],
  a:[['🐘','크다','big','커요'],['🐜','작다','small','작아요'],['🌷','예쁘다','pretty','예뻐요'],['🔴','빨갛다','red','빨개요'],
     ['😊','기쁘다','happy','기뻐요'],['🥵','덥다','hot','더워요'],['🥶','춥다','cold','추워요'],['🐍','길다','long','길어요'],
     ['😋','맛있다','yummy','맛있어요'],['🐣','귀엽다','cute','귀여워요'],['😢','슬프다','sad','슬퍼요'],['🪶','가볍다','light','가벼워요'],
     ['🧊','차갑다','icy','차가워요'],['🌙','어둡다','dark','어두워요']],
  d:[['💨','빨리','quickly'],['🐢','천천히','slowly'],['❗','아주','very'],['📢','크게','loudly'],['🤫','조용히','quietly'],
     ['👍','잘','well'],['🤝','함께','together'],['🔁','다시','again'],['🌅','일찍','early'],['🌃','늦게','late'],
     ['🦶','살금살금','softly'],['🍪','많이','a lot']]
};

// ── 문장 탐정: "품사:낱말|붙는말", x는 도우미 말(the, a, my) ──
const SENTS = [
  {em:'🐶', ko:'n:강아지|가 d:빨리 v:달려요',          en:'x:The n:dog v:runs d:quickly'},
  {em:'🐱', ko:'a:귀여운 n:고양이|가 v:자요',          en:'x:The a:cute n:cat v:sleeps'},
  {em:'🍎', ko:'n:엄마|가 a:빨간 n:사과|를 v:먹어요',   en:'n:Mom v:eats x:a a:red n:apple'},
  {em:'🐢', ko:'n:거북이|가 d:천천히 v:걸어요',        en:'x:The n:turtle v:walks d:slowly'},
  {em:'🐦', ko:'a:작은 n:새|가 d:크게 v:노래해요',      en:'x:The a:little n:bird v:sings d:loudly'},
  {em:'🐘', ko:'a:큰 n:코끼리|가 n:물|을 v:마셔요',     en:'x:The a:big n:elephant v:drinks n:water'},
  {em:'💃', ko:'n:아이들|이 d:함께 v:춤춰요',          en:'x:The n:kids v:dance d:together'},
  {em:'⚽', ko:'n:친구|가 n:공|을 d:세게 v:차요',       en:'x:My n:friend v:kicks x:the n:ball d:hard'},
  {em:'🐰', ko:'a:하얀 n:토끼|가 d:높이 v:뛰어요',      en:'x:The a:white n:rabbit v:jumps d:high'},
  {em:'👶', ko:'n:아기|가 d:또 v:울어요',              en:'x:The n:baby v:cries d:again'},
  {em:'🎨', ko:'n:누나|가 a:예쁜 n:꽃|을 v:그려요',     en:'x:My n:sister v:draws x:a a:pretty n:flower'},
  {em:'🐭', ko:'a:작은 n:생쥐|가 d:조용히 v:걸어요',    en:'x:The a:small n:mouse v:walks d:quietly'},
  {em:'📚', ko:'n:형|이 n:책|을 v:읽어요',             en:'x:My n:brother v:reads x:a n:book'},
  {em:'🐟', ko:'n:물고기|가 d:잘 v:헤엄쳐요',           en:'x:The n:fish v:swims d:well'}
];
function parse(s){
  return s.split(' ').map(function(t){
    const i=t.indexOf(':'), p=t.slice(0,i), r=t.slice(i+1).split('|');
    return {p:p, w:r[0], tail:r[1]||''};
  });
}
