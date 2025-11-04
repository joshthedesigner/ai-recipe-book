import AppButton from './AppButton';

interface AddRecipeButtonProps {
  onClick: () => void;
}

export default function AddRecipeButton({ onClick }: AddRecipeButtonProps) {
  return (
    <AppButton variant="primary" onClick={onClick}>
      Add Recipe
    </AppButton>
  );
}

