import MathEditor from "./MathEditor";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function ShortAnswer({
  value,
  onChange,
}: Props) {
  return (
    <MathEditor
      label="Odp. – krótka odpowiedź"
      placeholder="np. x = 3"
      value={value}
      onChange={onChange}
      variant="compact"
      rows={4}
    />
  );
}