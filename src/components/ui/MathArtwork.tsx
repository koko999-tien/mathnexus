export function MathArtwork() {
  return <svg viewBox="0 0 380 300" className="math-artwork" aria-hidden="true">
    <defs><pattern id="math-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M 25 0 L 0 0 0 25" fill="none" stroke="#547d59" strokeOpacity=".13" /></pattern><linearGradient id="math-orb" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9efb9" /><stop offset="1" stopColor="#86ad7e" /></linearGradient></defs>
    <rect x="20" y="10" width="340" height="280" fill="url(#math-grid)" />
    <circle cx="218" cy="143" r="87" fill="url(#math-orb)" opacity=".7" />
    <ellipse cx="218" cy="143" rx="122" ry="42" transform="rotate(-30 218 143)" fill="none" stroke="#416c51" strokeWidth="1.5" />
    <ellipse cx="218" cy="143" rx="51" ry="87" transform="rotate(24 218 143)" fill="none" stroke="#416c51" strokeOpacity=".45" />
    <path d="M142 99 Q218 133 295 184 M146 188 Q217 163 289 98 M218 56 L218 230" fill="none" stroke="#416c51" strokeOpacity=".25" />
    <circle cx="322" cy="84" r="7" fill="#355e45" /><circle cx="113" cy="204" r="5" fill="#355e45" /><circle cx="218" cy="143" r="4" fill="#355e45" />
    <g transform="translate(36 45) rotate(-10)"><rect width="103" height="57" rx="12" fill="#fcfff7" stroke="#d4e3c9" /><text x="16" y="36" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24" fill="#355e45">a² + b²</text></g>
    <g transform="translate(204 230) rotate(7)"><rect width="145" height="50" rx="12" fill="#fcfff7" stroke="#d4e3c9" /><text x="16" y="33" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24" fill="#355e45">eⁱᵖⁱ + 1 = 0</text></g>
    <text x="62" y="244" fontFamily="Georgia, serif" fontSize="42" fill="#416c51" opacity=".55">∫</text><path d="M331 171 v16 m-8-8 h16 M156 25 v12 m-6-6 h12" stroke="#416c51" strokeWidth="1.5" />
  </svg>;
}
