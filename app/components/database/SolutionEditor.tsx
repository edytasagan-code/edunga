import MathEditor from "./MathEditor";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function SolutionEditor({
  value,
  onChange,
}: Props) {
  return (
    <MathEditor
      label="Rozwiązanie"
      placeholder="Wpisz rozwiązanie..."
      value={value}
      onChange={onChange}
    />
  );
}