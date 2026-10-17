import SvgIcon from '@mui/material/SvgIcon';

/**
 * Ticket badge with RENT — uses currentColor for the ticket (set to primary pink),
 * black for the border and label.
 */
export default function ForRentTicketIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 48 48">
      <g transform="rotate(-14 24 24)">
        {/* Ticket body (inherits primary pink via currentColor) */}
        <path
          fill="currentColor"
          d="
            M7 13.5
            H33.5
            l1.15 1.15 1.15-1.15 1.15 1.15 1.15-1.15 1.15 1.15 1.15-1.15 1.25 0.85
            V33.15
            l-1.25 0.85-1.15-1.15-1.15 1.15-1.15-1.15-1.15 1.15-1.15-1.15-1.15 1.15
            H7
            V26.5
            A3.6 3.6 0 0 1 7 19.5
            Z
          "
        />
        {/* RENT */}
        <g transform="translate(27 23) skewX(-10)">
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#1a1a1a"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="Impact, Haettenschweiler, Arial Black, system-ui, sans-serif"
            letterSpacing="1"
          >
            RENT
          </text>
        </g>
      </g>
    </SvgIcon>
  );
}
