"use client";

import {
  stageCaption,
  stageWorkDense,
  stageWorkMeta,
  stageWorkMicro,
} from "@/lib/stages/ui";

export function ToKnowCriteriaGuide() {
  return (
    <details className="mb-3 rounded-xl border border-border-warm bg-panel/60">
      <summary className={`cursor-pointer list-none px-3 py-2.5 ${stageWorkDense} font-semibold text-foreground break-keep [&::-webkit-details-marker]:hidden`}>
        <span className="underline decoration-border-warm underline-offset-2">
          To-know 작성 기준 (NN/g · 디자인 씽킹)
        </span>
        <span className="ml-2 font-normal text-muted">펼쳐서 보기</span>
      </summary>
      <div className={`space-y-3 border-t border-border-warm px-3 py-3 ${stageWorkMeta} break-keep`}>
        <div>
          <p className={stageCaption}>Porter 5 Forces · 비즈니스 환경</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              <span className="font-semibold text-foreground">Company</span> — 자사(나) ·
              전략·역량
            </li>
            <li>
              <span className="font-semibold text-foreground">Customer</span> — Buyer ·
              기본정보·라이프스타일·맥락(Pre/On/Post-visit)·문제 인식·행태
            </li>
            <li>
              <span className="font-semibold text-foreground">Competitor</span> — 현재
              경쟁사 ·{" "}
              <span className="font-semibold text-foreground">New Comer</span> — 잠재
              경쟁 ·{" "}
              <span className="font-semibold text-foreground">Supplier</span> — 인프라·정책
            </li>
            <li>
              <span className="font-semibold text-foreground">Desk Research</span>(맥락
              조사)와 <span className="font-semibold text-foreground">필드</span>를
              방법 열에서 구분해 채웁니다.
            </li>
          </ul>
        </div>
        <div>
          <p className={stageCaption}>NN/g — 지식 상태와 위험도</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              <span className="font-semibold text-foreground">질문</span>: 데이터가
              없는 공백 ·{" "}
              <span className="font-semibold text-foreground">가정</span>: 근거 부족한
              ‘맞을 것’(가장 위험 — 사실로 착각 금지) ·{" "}
              <span className="font-semibold text-foreground">사실</span>: 근거 있는 확인
            </li>
            <li>
              <span className="font-semibold text-foreground">확실성 낮음 + 위험도 높음</span>
              항목을 To-know 최우선 검증 대상으로 둡니다.
            </li>
            <li>
              솔루션 검증이 아니라{" "}
              <span className="font-semibold text-foreground">근본 문제·장벽</span>을
              밝히는 질문으로 정의합니다.
            </li>
          </ul>
        </div>
        <div>
          <p className={stageCaption}>디자인 씽킹 — 3대 렌즈 · 공감 축</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>
              렌즈:{" "}
              <span className="font-semibold text-foreground">소망성</span> ·{" "}
              <span className="font-semibold text-foreground">실현 가능성</span> ·{" "}
              <span className="font-semibold text-foreground">지속 가능성</span>
            </li>
            <li>
              공감 축:{" "}
              <span className="font-semibold text-foreground">맥락</span> ·{" "}
              <span className="font-semibold text-foreground">행동·우회로</span> ·{" "}
              <span className="font-semibold text-foreground">감정</span>
            </li>
          </ul>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border-warm bg-cream">
          <table className={`w-full min-w-[520px] border-collapse text-left ${stageWorkMicro}`}>
            <thead>
              <tr className="bg-surface font-semibold text-foreground">
                <th className="border-b border-border-warm px-2 py-1.5">기준</th>
                <th className="border-b border-border-warm px-2 py-1.5">좋은 질문</th>
                <th className="border-b border-border-warm px-2 py-1.5">피할 질문</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-border-warm px-2 py-1.5 font-semibold text-foreground">
                  행동 지향
                </td>
                <td className="border-b border-border-warm px-2 py-1.5">
                  기존 방식에서 가장 크게 좌절하는 순간은?
                </td>
                <td className="border-b border-border-warm px-2 py-1.5 text-muted">
                  우리 서비스를 좋아할까?
                </td>
              </tr>
              <tr>
                <td className="border-b border-border-warm px-2 py-1.5 font-semibold text-foreground">
                  임팩트
                </td>
                <td className="border-b border-border-warm px-2 py-1.5">
                  이 기능을 쓰지 않고 이탈하는 근본 이유는?
                </td>
                <td className="border-b border-border-warm px-2 py-1.5 text-muted">
                  선호하는 폰트 크기는? (초기)
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1.5 font-semibold text-foreground">개방성</td>
                <td className="px-2 py-1.5">
                  원하는 정보를 찾기 위해 어떤 탐색 경로를 거치는가?
                </td>
                <td className="px-2 py-1.5 text-muted">
                  검색 필터가 편리한가?
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-foreground">
          핵심: 팀이 당연히 맞다고 믿는{" "}
          <span className="font-semibold">가정(Assumptions)</span>과, 틀렸을 때
          프로젝트를 망가뜨릴{" "}
          <span className="font-semibold">고위험 미지(High-risk Unknowns)</span>를
          리서치 질문으로 바꿉니다.
        </p>
      </div>
    </details>
  );
}
