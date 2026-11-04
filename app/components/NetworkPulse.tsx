type NetworkPulseProps = {
  className?: string;
};

const NODES = [
  { x: 44, y: 40, r: 4 },
  { x: 250, y: 30, r: 5 },
  { x: 286, y: 96, r: 3.5 },
  { x: 220, y: 138, r: 4.5 },
  { x: 90, y: 132, r: 3.5 },
  { x: 24, y: 96, r: 3 },
];

const LINKS = [
  { x1: 160, y1: 80, x2: 44, y2: 40, delay: "0s" },
  { x1: 160, y1: 80, x2: 250, y2: 30, delay: "-2s" },
  { x1: 160, y1: 80, x2: 286, y2: 96, delay: "-4s" },
  { x1: 160, y1: 80, x2: 220, y2: 138, delay: "-1s" },
  { x1: 160, y1: 80, x2: 90, y2: 132, delay: "-3s" },
  { x1: 160, y1: 80, x2: 24, y2: 96, delay: "-5s" },
  { x1: 44, y1: 40, x2: 24, y2: 96, delay: "-2.5s" },
  { x1: 90, y1: 132, x2: 220, y2: 138, delay: "-4.5s" },
];

export default function NetworkPulse({ className = "" }: NetworkPulseProps) {
  return (
    <svg
      viewBox="0 0 320 168"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pulse-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {LINKS.map((link, index) => (
        <line
          key={index}
          x1={link.x1}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
          stroke="url(#pulse-line)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.55"
          className="animate-dash-flow"
          style={{ animationDelay: link.delay }}
        />
      ))}

      <g className="animate-float-slow">
        <circle cx="160" cy="80" r="52" fill="url(#pulse-glow)" opacity="0.6" />
        <circle cx="160" cy="80" r="26" stroke="#34d399" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="160" cy="80" r="15" stroke="#34d399" strokeOpacity="0.55" strokeWidth="1.25" />
        <circle cx="160" cy="80" r="7" fill="#34d399" />
        <circle cx="160" cy="80" r="7" fill="#34d399" opacity="0.35" className="animate-ping" />
      </g>

      {NODES.map((node, index) => (
        <g key={index}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r + 4}
            fill="#22d3ee"
            opacity="0.12"
          />
          <circle cx={node.x} cy={node.y} r={node.r} fill="#67e8f9" />
        </g>
      ))}
    </svg>
  );
}
