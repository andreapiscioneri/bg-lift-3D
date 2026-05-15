export default function BGLiftLogo({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 410 94"
      className={className}
      aria-label="BG Lift"
      role="img"
    >
      {/* BG — orange, black weight */}
      <text
        x="0" y="66"
        fontFamily="Montserrat, 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="68"
        fill="#EC6726"
        letterSpacing="-1"
      >BG</text>

      {/* LIFT — light gray */}
      <text
        x="105" y="66"
        fontFamily="Montserrat, Arial, sans-serif"
        fontWeight="300"
        fontSize="68"
        fill="#C0C0C0"
        letterSpacing="3"
      >LIFT</text>

      {/* Italian tricolor — vertical, small, under LIFT */}
      <rect x="106" y="70" width="7.5" height="13" fill="#009246" rx="0.5"/>
      <rect x="113.5" y="70" width="7.5" height="13" fill="#f0f0f0" stroke="#ddd" strokeWidth="0.3"/>
      <rect x="121" y="70" width="7.5" height="13" fill="#CE2B37" rx="0.5"/>

      {/* Panther head — line art, right side */}
      <g transform="translate(278, 1) scale(1.0)">
        {/* Main head outline */}
        <path
          d="M 44 7
             C 36 3 24 9 19 22
             C 14 33 17 46 25 53
             C 19 57 17 65 23 72
             C 29 78 41 79 51 75
             C 60 71 71 63 78 53
             C 84 47 85 37 81 27
             C 86 19 86 8 79 4
             C 73 0 63 4 60 11
             C 54 5 50 3 44 7 Z"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Left/far ear (partly hidden) */}
        <path
          d="M 19 22 C 11 13 15 1 23 1 C 31 0 37 8 37 17"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Right/near ear */}
        <path
          d="M 79 4 C 83 -3 94 -1 95 8 C 96 17 88 23 81 25"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Eye socket */}
        <ellipse cx="64" cy="30" rx="6.5" ry="7.5" fill="none" stroke="#EC6726" strokeWidth="1.8"/>
        {/* Eye — orange iris */}
        <ellipse cx="64" cy="30" rx="3.2" ry="4" fill="#EC6726" opacity="0.5"/>
        {/* Pupil */}
        <ellipse cx="64" cy="30" rx="1.2" ry="2.8" fill="#1a1a1a" opacity="0.7"/>

        {/* Brow ridge */}
        <path
          d="M 56 22 C 60 19 68 19 74 22"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Nose bridge + nose */}
        <path
          d="M 50 44 L 55 50 L 62 49 L 57 43 Z"
          fill="#333333"
          stroke="none"
        />

        {/* Muzzle pad / upper lip */}
        <path
          d="M 33 48 C 40 45 50 44 57 43 C 64 42 72 45 79 51"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Lower jaw / chin */}
        <path
          d="M 25 53 C 30 66 41 75 51 75 C 62 75 72 70 79 61"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Open lower jaw */}
        <path
          d="M 34 60 C 43 72 53 78 63 76 C 73 74 81 66 83 55"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Fangs */}
        <path d="M 40 60 L 38 69 L 44 63" fill="none" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 51 65 L 50 73 L 55 67" fill="none" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 68 63 L 70 71 L 65 66" fill="none" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>

        {/* Whisker lines — left */}
        <line x1="44" y1="47" x2="20" y2="40" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.5"/>
        <line x1="44" y1="51" x2="18" y2="51" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.5"/>
        {/* Whisker lines — right */}
        <line x1="70" y1="47" x2="94" y2="39" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.5"/>
        <line x1="70" y1="51" x2="95" y2="51" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.5"/>

        {/* Fur texture — cheek left */}
        <path d="M 21 30 C 17 33 17 39 21 42" fill="none" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.35"/>
        <path d="M 20 44 C 17 48 18 54 22 56" fill="none" stroke="#1a1a1a" strokeWidth="0.9" opacity="0.35"/>
      </g>

      {/* ® — top-right of panther area */}
      <text
        x="377" y="14"
        fontFamily="Arial, sans-serif"
        fontWeight="400"
        fontSize="12"
        fill="#1a1a1a"
      >®</text>

      {/* Tagline */}
      <text
        x="0" y="91"
        fontFamily="Montserrat, Arial, sans-serif"
        fontWeight="500"
        fontSize="8"
        fill="#888888"
        letterSpacing="1.8"
      >SIMPLE ANSWERS TO COMPLEX LIFTING REQUESTS</text>
    </svg>
  )
}
