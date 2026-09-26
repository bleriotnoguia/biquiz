import { scriptureUrl } from "../utils/scriptureLink"
import "./ScriptureReference.css"

type Props = {
  reference: string
  lang: string
}

const ScriptureReference = ({ reference, lang }: Props) => {
  const url = scriptureUrl(reference, lang)
  if (!reference) return null
  if (!url) return <>{reference}</>
  return (
    <a className="scripture-link" href={url} target="_blank" rel="noopener noreferrer">
      {reference}
    </a>
  )
}

export default ScriptureReference
