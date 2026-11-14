/** 전화번호가 들어 있으면 누르면 전화가 걸리는 링크로, 아니면 글자 그대로 보여 준다. */
export default function PhoneLink({ number }: { number: string }) {
  const dial = /\+?\d[\d\s-]{5,}\d/.exec(number)?.[0].replace(/[^\d+]/g, '')
  return dial ? <a className="link" href={`tel:${dial}`}>{number}</a> : <span>{number}</span>
}
