import MathEditor from "./MathEditor";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function TaskEditor({
  value,
  onChange,
}: Props) {
  return (
    <MathEditor
      label="Treść zadania"
      placeholder="Wpisz treść zadania..."
      value={value}
      onChange={onChange}
    />
  );
}