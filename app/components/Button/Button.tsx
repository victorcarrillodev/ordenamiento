import { css, type Handle } from "remix/ui";

 export interface  ButtonProps{
data: string;
type: "contained"|"outlend"|"text";
 }


const contained=css({
    backgroundColor:"red"

})
const outlend=css({
    backgroundColor:"black"
})
const text=css({
    backgroundColor:"blue"
})
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