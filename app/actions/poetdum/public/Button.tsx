import { css, type Handle } from "remix/ui";

export interface ButtonProps {
  data: string;
}

const componetBtn = css({
  backgroundColor: "red",
  borderRadius: "1rem",
  width: "3rem",
  height: "1.5rem",
  border: "none",
  cursor: "pointer",
})

export default function Button(handle: Handle<ButtonProps>) {
  return () => (
    <button mix={componetBtn}>
      {handle.props.data}
    </button>
  )
}