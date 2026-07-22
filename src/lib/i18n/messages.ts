/** 정적 UI 카피 — 키 목록 (ko/en 공통) */
export type MessageKey =
  | "landing.navAria"
  | "landing.nav.about"
  | "landing.nav.work"
  | "landing.nav.cases"
  | "landing.nav.pricing"
  | "landing.nav.contact"
  | "landing.login"
  | "landing.start"
  | "nav.home"
  | "nav.projects"
  | "nav.archive"
  | "nav.invest"
  | "nav.systemMenu"
  | "nav.search.home"
  | "nav.search.workspace"
  | "nav.search.hub"
  | "nav.notifications"
  | "nav.userMenu"
  | "theme.aria"
  | "theme.system"
  | "theme.light"
  | "theme.dark"
  | "archive.title"
  | "archive.eyebrow"
  | "archive.lead"
  | "archive.count"
  | "archive.empty"
  | "archive.startStage1"
  | "archive.view"
  | "archive.editInStage"
  | "archive.back"
  | "archive.backList"
  | "archive.savedAt"
  | "archive.noSummary"
  | "archive.confidence.discovery"
  | "archive.confidence.hypothesis"
  | "archive.all"
  | "archive.unsupported"
  | "sidebar.archive"
  | "sidebar.collapse"
  | "sidebar.expand"
  | "sidebar.myProjects"
  | "macro.empathize"
  | "macro.analyze"
  | "macro.ideate"
  | "macro.prototype"
  | "macro.business"
  | "macro.complete"
  | "macro.inProgress"
  | "stage.1.nav"
  | "stage.2.nav"
  | "stage.3.nav"
  | "stage.4.nav"
  | "stage.5.nav"
  | "stage.6.nav"
  | "stage.7.nav"
  | "stage.8.nav"
  | "stage.9.nav"
  | "stage.10.nav"
  | "stage.11.nav"
  | "stage.12.nav"
  | "stage.13.nav"
  | "stage.14.nav"
  | "stage.15.nav"
  | "stage.16.nav"
  | "artifact.1"
  | "artifact.2"
  | "artifact.3"
  | "artifact.4"
  | "artifact.5"
  | "artifact.6"
  | "artifact.7"
  | "artifact.8"
  | "artifact.9"
  | "artifact.10"
  | "artifact.11"
  | "artifact.12"
  | "artifact.13"
  | "artifact.14"
  | "artifact.15"
  | "artifact.16"
  | "stage.prefix"
  | "hub.brand"
  | "guide.badge"
  | "guide.stageMeta"
  | "guide.minimalLead"
  | "guide.todoHeading"
  | "guide.tipPrefix"
  | "guide.dontShowAgain"
  | "guide.reopenHint"
  | "guide.closeAria"
  | "guide.close"
  | "guide.confirm"
  | "guide.start"
  | "guide.view"
  | "guide.essenceBadge"
  | "guide.stage5TitleSuffix"
  | "coach.status.listening"
  | "coach.status.thinking"
  | "coach.status.typing"
  | "coach.status.pointing"
  | "coach.status.suggesting"
  | "coach.status.welcoming"
  | "coach.status.exploring"
  | "coach.status.expanding"
  | "coach.connectionIssue"
  | "coach.guide.example"
  | "coach.guide.reference"
  | "coach.guide.add"
  | "coach.guide.added"
  | "common.loading"
  | "common.saving"
  | "common.saved"
  | "common.error";

export type MessageCatalog = Record<MessageKey, string>;

export const KO_MESSAGES: MessageCatalog = {
  "landing.navAria": "주요 메뉴",
  "landing.nav.about": "소개",
  "landing.nav.work": "우리가 하는 일",
  "landing.nav.cases": "사례",
  "landing.nav.pricing": "요금",
  "landing.nav.contact": "문의",
  "landing.login": "로그인",
  "landing.start": "시작하기 →",
  "nav.home": "홈",
  "nav.projects": "프로젝트",
  "nav.archive": "자료실",
  "nav.invest": "투자·지원",
  "nav.systemMenu": "시스템 메뉴",
  "nav.search.home": "프로젝트·자료실·프로그램 검색…",
  "nav.search.workspace": "자료실·단계·메모리에서 검색",
  "nav.search.hub": "프로젝트·자료실·메모리에서 검색",
  "nav.notifications": "알림",
  "nav.userMenu": "사용자 메뉴",
  "theme.aria": "화면 테마",
  "theme.system": "시스템",
  "theme.light": "라이트",
  "theme.dark": "다크",
  "archive.title": "프로젝트 산출물",
  "archive.eyebrow": "자료실",
  "archive.lead":
    "각 단계에서 만든 결과가 여기에 쌓여요. 이전 단계로 돌아가도 작업 내용은 그대로 남고, 여기서 한눈에 확인할 수 있어요.",
  "archive.count": "산출물 {count}건",
  "archive.empty":
    "아직 자료실에 쌓인 산출물이 없어요. 단계를 진행하면 결과가 자동으로 저장돼요.",
  "archive.startStage1": "단계 1부터 시작하기",
  "archive.view": "자료 보기",
  "archive.editInStage": "단계에서 편집",
  "archive.back": "← 자료실",
  "archive.backList": "← 자료실 목록",
  "archive.savedAt": "{date} 저장",
  "archive.noSummary": "저장된 요약이 없어요.",
  "archive.confidence.discovery": "웹·현장 근거",
  "archive.confidence.hypothesis": "가설 · 검증 필요",
  "archive.all": "전체 ({count})",
  "archive.unsupported": "단계 {stageId} 자료 보기는 아직 준비 중이에요.",
  "sidebar.archive": "자료실",
  "sidebar.collapse": "사이드바 접기",
  "sidebar.expand": "사이드바 펼치기",
  "sidebar.myProjects": "내 프로젝트",
  "macro.empathize": "공감하기",
  "macro.analyze": "발견 정리하기",
  "macro.ideate": "아이디어 만들기",
  "macro.prototype": "시제품 만들기",
  "macro.business": "사업화 검토",
  "macro.complete": " · 완료",
  "macro.inProgress": " · 진행",
  "stage.1.nav": "문제 정의하기",
  "stage.2.nav": "사전 조사하기",
  "stage.3.nav": "사용자 조사 준비하기",
  "stage.4.nav": "발견 정리하기",
  "stage.5.nav": "사용자 여정 지도 그리기",
  "stage.6.nav": "진짜 필요 찾기",
  "stage.7.nav": "HMW 질문 만들기",
  "stage.8.nav": "아이디어 펼치기",
  "stage.9.nav": "우선순위 정하기",
  "stage.10.nav": "컨셉 정리하기",
  "stage.11.nav": "시제품 만들기",
  "stage.12.nav": "테스트로 검증",
  "stage.13.nav": "사업 타당성",
  "stage.14.nav": "90일 로드맵",
  "stage.15.nav": "사업 제안서",
  "stage.16.nav": "투자·지원 연결",
  "artifact.1": "프로젝트 개요 및 문제 정의서",
  "artifact.2": "사전 조사 리포트",
  "artifact.3": "리서치 준비서",
  "artifact.4": "조사 발견 정리서",
  "artifact.5": "사용자 여정 지도",
  "artifact.6": "잠재 니즈 보드",
  "artifact.7": "HMW 질문 보드",
  "artifact.8": "아이디어 그리드",
  "artifact.9": "우선순위 매트릭스",
  "artifact.10": "컨셉 시트",
  "artifact.11": "인터랙티브 시제품",
  "artifact.12": "사용성 테스트 결과",
  "artifact.13": "사업 타당성 시트",
  "artifact.14": "90일 실행 계획",
  "artifact.15": "피치 덱",
  "artifact.16": "투자·지원 연결 자료",
  "stage.prefix": "단계",
  "hub.brand": "HiDD 디자인씽킹",
  "guide.badge": "단계 가이드",
  "guide.stageMeta": "{macro} · 단계 {stage}",
  "guide.minimalLead": "이 단계에서 해야 할 일만 정리했어요.",
  "guide.todoHeading": "이 단계에서 할 일",
  "guide.tipPrefix": "팁:",
  "guide.dontShowAgain": "다음부터 보지 않기",
  "guide.reopenHint":
    "가이드는 단계 제목 옆 「가이드 보기」에서 다시 열 수 있어요.",
  "guide.closeAria": "가이드 닫기",
  "guide.close": "닫기",
  "guide.confirm": "확인",
  "guide.start": "시작하기 →",
  "guide.view": "가이드 보기",
  "guide.essenceBadge": "정수 자리",
  "guide.stage5TitleSuffix": " · 니즈 분석하기",
  "coach.status.listening": "듣는 중",
  "coach.status.thinking": "생각하는 중",
  "coach.status.typing": "입력하는 중",
  "coach.status.pointing": "짚어주는 중",
  "coach.status.suggesting": "제안 중",
  "coach.status.welcoming": "환영",
  "coach.status.exploring": "함께 짚어보는 중",
  "coach.status.expanding": "함께 펼치는 중",
  "coach.connectionIssue": "연결 문제",
  "coach.guide.example": "예",
  "coach.guide.reference": "참고",
  "coach.guide.add": "추가",
  "coach.guide.added": "추가됨",
  "common.loading": "불러오는 중…",
  "common.saving": "저장 중…",
  "common.saved": "저장됨",
  "common.error": "문제가 발생했어요.",
};

export const EN_MESSAGES: MessageCatalog = {
  "landing.navAria": "Main menu",
  "landing.nav.about": "About",
  "landing.nav.work": "What we do",
  "landing.nav.cases": "Cases",
  "landing.nav.pricing": "Pricing",
  "landing.nav.contact": "Contact",
  "landing.login": "Log in",
  "landing.start": "Get started →",
  "nav.home": "Home",
  "nav.projects": "Projects",
  "nav.archive": "Archive",
  "nav.invest": "Funding",
  "nav.systemMenu": "System menu",
  "nav.search.home": "Search projects, archive, programs…",
  "nav.search.workspace": "Search archive, stages, memory",
  "nav.search.hub": "Search projects, archive, memory",
  "nav.notifications": "Notifications",
  "nav.userMenu": "User menu",
  "theme.aria": "Theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "archive.title": "Project artifacts",
  "archive.eyebrow": "Archive",
  "archive.lead":
    "Results from each stage collect here. Going back doesn’t erase your work—you can review everything in one place.",
  "archive.count": "{count} artifacts",
  "archive.empty":
    "No artifacts yet. Progress through stages and results will save automatically.",
  "archive.startStage1": "Start from stage 1",
  "archive.view": "View",
  "archive.editInStage": "Edit in stage",
  "archive.back": "← Archive",
  "archive.backList": "← Archive list",
  "archive.savedAt": "Saved {date}",
  "archive.noSummary": "No saved summary yet.",
  "archive.confidence.discovery": "Field / web evidence",
  "archive.confidence.hypothesis": "Hypothesis · needs validation",
  "archive.all": "All ({count})",
  "archive.unsupported": "Stage {stageId} archive view is not ready yet.",
  "sidebar.archive": "Archive",
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.expand": "Expand sidebar",
  "sidebar.myProjects": "My projects",
  "macro.empathize": "Empathize",
  "macro.analyze": "Define & analyze",
  "macro.ideate": "Ideate",
  "macro.prototype": "Prototype",
  "macro.business": "Business check",
  "macro.complete": " · Done",
  "macro.inProgress": " · In progress",
  "stage.1.nav": "Define the problem",
  "stage.2.nav": "Desk research",
  "stage.3.nav": "Prepare user research",
  "stage.4.nav": "Synthesize findings",
  "stage.5.nav": "User journey map",
  "stage.6.nav": "Find latent needs",
  "stage.7.nav": "How Might We",
  "stage.8.nav": "Ideation",
  "stage.9.nav": "Prioritize",
  "stage.10.nav": "Concept sheet",
  "stage.11.nav": "Prototype",
  "stage.12.nav": "Usability test",
  "stage.13.nav": "Business feasibility",
  "stage.14.nav": "90-day roadmap",
  "stage.15.nav": "Pitch deck",
  "stage.16.nav": "Funding match",
  "artifact.1": "Project overview & problem statement",
  "artifact.2": "Pre-PMF research report",
  "artifact.3": "Research prep brief",
  "artifact.4": "Findings synthesis",
  "artifact.5": "User journey map",
  "artifact.6": "Latent needs board",
  "artifact.7": "HMW question board",
  "artifact.8": "Idea grid",
  "artifact.9": "Priority matrix",
  "artifact.10": "Concept sheet",
  "artifact.11": "Interactive prototype",
  "artifact.12": "Usability test results",
  "artifact.13": "Feasibility sheet",
  "artifact.14": "90-day plan",
  "artifact.15": "Pitch deck",
  "artifact.16": "Funding connection pack",
  "stage.prefix": "Stage",
  "hub.brand": "HiDD Design Thinking",
  "guide.badge": "Stage guide",
  "guide.stageMeta": "{macro} · Stage {stage}",
  "guide.minimalLead": "Here’s only what to do in this stage.",
  "guide.todoHeading": "What to do in this stage",
  "guide.tipPrefix": "Tip:",
  "guide.dontShowAgain": "Don’t show again",
  "guide.reopenHint":
    "You can reopen the guide with “View guide” next to the stage title.",
  "guide.closeAria": "Close guide",
  "guide.close": "Close",
  "guide.confirm": "Got it",
  "guide.start": "Start →",
  "guide.view": "View guide",
  "guide.essenceBadge": "Core moment",
  "guide.stage5TitleSuffix": " · Needs analysis",
  "coach.status.listening": "Listening",
  "coach.status.thinking": "Thinking",
  "coach.status.typing": "Typing",
  "coach.status.pointing": "Pointing out",
  "coach.status.suggesting": "Suggesting",
  "coach.status.welcoming": "Welcome",
  "coach.status.exploring": "Exploring together",
  "coach.status.expanding": "Expanding ideas",
  "coach.connectionIssue": "Connection issue",
  "coach.guide.example": "Ex",
  "coach.guide.reference": "Note",
  "coach.guide.add": "Add",
  "coach.guide.added": "Added",
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.saved": "Saved",
  "common.error": "Something went wrong.",
};
