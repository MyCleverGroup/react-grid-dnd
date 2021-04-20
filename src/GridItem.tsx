import * as React from "react";
import {
  StateType,
  useGestureResponder,
  ResponderEvent
} from "react-gesture-responder";
import { animated, interpolate, useSpring } from "react-spring";
import { GridItemContext } from "./GridItemContext";

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GridItem({
  children,
  style,
  className,
  ...other
}: GridItemProps) {
  const context = React.useContext(GridItemContext);

  if (!context) {
    throw Error(
      "Unable to find GridItem context. Please ensure that GridItem is used as a child of GridDropZone"
    );
  }

  const {
    top,
    disableDrag,
    endTraverse,
    onStart,
    mountWithTraverseTarget,
    left,
    i,
    onMove,
    onEnd,
    grid,
    dragging: isDragging,
    scrollContainer
  } = context;

  const { columnWidth, rowHeight } = grid;
  const dragging = React.useRef(false);
  const startCoords = React.useRef([left, top]);

  const [styles, set] = useSpring(() => {
    if (mountWithTraverseTarget) {
      // this feels really brittle. unsure of a better
      // solution for now.

      const mountXY = mountWithTraverseTarget;

      endTraverse();

      return {
        xy: mountXY,
        immediate: true,
        zIndex: "1",
        scale: 1.1,
        opacity: 0.8
      };
    }

    return {
      xy: [left, top],
      immediate: true,
      zIndex: "0",
      scale: 1,
      opacity: 1
    };
  });

  // handle move updates imperatively
  function handleMove(state: StateType, e: Object) {
    var x = startCoords.current[0] + state.delta[0];
    var y = startCoords.current[1] + state.delta[1];

    //if they hit the scroll boundaries stick to that point
    if(scrollContainer){
      //touches top boundary
      if(y <= scrollContainer.scrollTop){
        y = scrollContainer.scrollTop;
      }
      //touches bottom boundary
      else if(y >= scrollContainer.scrollTop + scrollContainer.clientHeight - grid.rowHeight){
        y = scrollContainer.scrollTop + scrollContainer.clientHeight - grid.rowHeight;
      }
    }else{
      //touches top boundary
      if(y <= window.scrollY){
        y = window.scrollY;
      }
      //touches bottom boundary
      else if(y >= document.documentElement.scrollTop + document.documentElement.clientHeight - grid.rowHeight){
        y = document.documentElement.scrollTop + document.documentElement.clientHeight - grid.rowHeight;
      }
    }

    set({
      xy: [x, y],
      zIndex: "1",
      immediate: true,
      opacity: 0.8,
      scale: 1.1
    });

    onMove(state, x, y);
  }

  // handle end of drag
  function handleEnd(state: StateType) {
    const x = startCoords.current[0] + state.delta[0];
    const y = startCoords.current[1] + state.delta[1];
    dragging.current = false;
    onEnd(state, x, y);
  }

  const { bind } = useGestureResponder(
    {
      onMoveShouldSet: state => {
        if (disableDrag) {
          return false;
        }

        onStart();

        startCoords.current = [left, top];
        dragging.current = true;
        return true;
      },
      onMove: handleMove,
      onTerminationRequest: () => {
        if (dragging.current) {
          return false;
        }

        return true;
      },
      onTerminate: handleEnd,
      onRelease: handleEnd
    },
    {
      enableMouse: true
    }
  );

  /**
   * Update our position when left or top
   * values change
   */

  React.useEffect(() => {
    if (!dragging.current) {
      set({
        xy: [left, top],
        zIndex: "0",
        opacity: 1,
        scale: 1,
        immediate: false
      });
    }
  }, [dragging.current, left, top]);

  const props = {
    className:
      (className ? className : "GridItem") +
      (isDragging ? " dragging" : "") +
      (!!disableDrag ? " disabled" : ""),
    ...bind,
    style: {
      cursor: !!disableDrag ? "grab" : undefined,
      zIndex: styles.zIndex,
      position: "absolute",
      width: columnWidth + "px",
      opacity: styles.opacity,
      height: rowHeight + "px",
      boxSizing: "border-box",
      transform: interpolate(
        [styles.xy, styles.scale],
        (xy: any, s: any) =>
          `translate3d(${xy[0]}px, ${xy[1]}px, 0) scale(${s})`
      ),
      ...style
    },
    ...other
  };

  return typeof children === "function" ? (
    children(animated.div, props, {
      dragging: isDragging,
      disabled: !!disableDrag,
      i,
      grid
    })
  ) : (
    <animated.div {...props}>{children}</animated.div>
  );
}