import { css, type Handle } from "remix/ui";
import { shadows } from "../../styles/shadows.tsx";


 export interface  ButtonProps{
data: string;
type: "contained"|"outlend"|"text";
 }


const contained = css({
  width: "auto",

  backgroundColor: "#6956F3",
  color: "#fff",

  borderRadius: "10px",
  padding: "10px 24px",

  fontSize: "16px",
  fontWeight: 600,

  boxShadow: shadows.lg,

  "&:hover": {
    backgroundColor: "#5845E5",
    boxShadow: shadows.lg,
  },

 
});
const outlend=css({
    width:"auto",
    boxShadow: shadows.lg,




      color: "#6956F3",
    borderColor: "#6956F3",
    borderRadius: "10px",
   padding: "10px 24px",
    fontSize: "16px",
    fontWeight: 600,
    

    "&:hover": {
      borderColor: "#5845E5",
      backgroundColor: "rgba(105, 86, 243, 0.08)",
    },
})
const text = css({
  width: "auto",
    boxShadow: shadows.md,



  border: "none",
  background: "transparent",

  color: "#6956F3",

  padding: "6px 8px",
  margin: "0",

  fontSize: "16px",
  fontWeight: 600,
  fontFamily: "inherit",

  cursor: "pointer",

  appearance: "none",
  WebkitAppearance: "none",

  "&:hover": {
    backgroundColor: "rgba(105, 86, 243, 0.08)",
  },

  "&:focus": {
    outline: "none",
  },
});
 const mapButton={
    contained:contained,
    outlend:outlend,
    text:text,

    
 }

export default function Button1(handle: Handle<ButtonProps>) {
  return () => {
    const EligeColor =mapButton[handle.props.type]
    return(
         <button mix={EligeColor} >
        {handle.props.data}
    </button>
    )
  }

}