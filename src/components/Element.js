import React from "react";
import { isTouchCapable } from "../lib/touch";

function Element({
  onDragStart,
  onDragStop,
  position,
  size,
  hoverEffect,
  imgUrl,
  name,
  pinned,
}) {
  const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(
    name
  )}`;
  const onProps = isTouchCapable
    ? { onTouchStart: (e) => onDragStart(e), onTouchEnd: (e) => onDragStop(e) }
    : { onMouseDown: (e) => onDragStart(e), onMouseUp: (e) => onDragStop(e) };
  const positionProps = position
    ? {
        left: position.x - 50 + "px",
        top: position.y - 50 + "px",
        position: "absolute",
      }
    : {};
  return (
    <div
      {...onProps}
      style={{
        backgroundColor: "#fefefe",
        width: size.w + "px",
        height: size.h + "px",
        padding: "5px",
        borderRadius: "5px",
        outline: pinned ? "#333 solid 3px" : "#eee solid 2px",
        boxShadow: hoverEffect
          ? "rgba(0, 0, 0, 0.5) 0 0 20px"
          : "10px 10px 10px -2px rgba(0, 0, 0, 0.05)",
        ...positionProps,
      }}
    >
      <span
        style={{
          whiteSpace: "nowrap",
          maxWidth: size.w + "px",
          overflow: "hidden",
          display: "inline-block",
          textOverflow: "ellipsis",
        }}
      >
        <a href={url} target="_blank">
          <b>{name}</b>
        </a>
      </span>
      <img
        alt={""}
        style={{ marginTop: "-8px", marginLeft: "8px" }}
        src={imgUrl || "https://i.imgur.com/HJaAOuF.png"}
        width={size.w - 25 + "px"}
        height={size.h - 25 + "px"}
      />
    </div>
  );
}

export default Element;
