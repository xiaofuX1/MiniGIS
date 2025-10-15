import React from "react";
import "./NorthArrow.css";

const NorthArrow: React.FC = () => {
  return (
    <svg
      className="north-arrow-svg"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
        {/* 北方向箭头 - 红色 */}
        <path
          d="M 50 10 L 65 50 L 50 45 L 35 50 Z"
          fill="#e74c3c"
          stroke="#c0392b"
          strokeWidth="1.5"
        />
        
        {/* 南方向箭头 - 灰色 */}
        <path
          d="M 50 90 L 65 50 L 50 55 L 35 50 Z"
          fill="#95a5a6"
          stroke="#7f8c8d"
          strokeWidth="1.5"
        />
        
        {/* 中心点 */}
        <circle cx="50" cy="50" r="3" fill="#333" />
        
        {/* N字母 */}
        <text
          x="50"
          y="8"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#e74c3c"
          fontFamily="Arial, sans-serif"
        >
          N
        </text>
    </svg>
  );
};

export default NorthArrow;
