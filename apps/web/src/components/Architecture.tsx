export function Architecture({ variant = 0 }: { variant?: number }) {
  const id = `architecture-${variant}`;
  return (
    <svg
      className="architecture"
      viewBox="0 0 600 250"
      role="img"
      aria-label="BuildOS"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M28 0H0V28"
            fill="none"
            stroke="currentColor"
            strokeWidth=".4"
            opacity=".18"
          />
        </pattern>
      </defs>
      <rect width="600" height="250" fill={`url(#${id})`} />
      <g fill="none" stroke="currentColor" strokeLinejoin="round">
        <path
          opacity=".2"
          d="M30 210 290 70 570 205M30 230 290 90 570 225M80 250 330 115M140 250 380 140M200 250 430 165M260 250 480 190"
        />
        <path
          fill="currentColor"
          fillOpacity=".05"
          d="m170 190 100-55 0-103-100 55Zm100-158 85 45v105l-85-47Z"
        />
        <path
          strokeWidth="1.6"
          d="m170 190 100-55V32L170 87Zm100-158 85 45v105l-85-47M170 87l85 47 100-57M255 134v103l-85-47m85 47 100-55"
        />
        <path
          opacity=".45"
          d="m185 90 0 92m16-101v92m16-101v92m16-101v92M170 108l85 45 100-55M170 131l85 45 100-55M170 154l85 45 100-55M170 177l85 45 100-55M287 86v40m17-31v40m17-31v40m17-31v40"
        />
        <path
          fill="currentColor"
          fillOpacity=".08"
          d="m355 183 60-33V96l-60 33-44-24v51Z"
        />
        <path d="m355 183 60-33V96l-60 33-44-24v51Zm0 0v-54m-44-24 60-33 44 24M320 129l35 19 60-32m-95 34 35 19 60-33" />
        <path
          strokeDasharray="3 5"
          opacity=".3"
          d="M270 32V8M170 87 133 67M415 96l37-20"
        />
        <path
          d="M110 191V35h107M106 57h114M119 35l67 22m-67-22 32 22m-41-5 9 139m98-156v31m-4 0h8"
          strokeWidth="1.3"
        />
        <path d="M98 191h24m-19-2 7-14 8 14" />
        <circle cx="460" cy="177" r="19" opacity=".3" />
        <path opacity=".3" d="M460 196v22m-9-36 9 8 10-14" />
      </g>
      <g fill="currentColor">
        <circle cx="170" cy="190" r="3" />
        <circle cx="355" cy="183" r="3" />
        <circle cx="270" cy="32" r="3" />
      </g>
    </svg>
  );
}
