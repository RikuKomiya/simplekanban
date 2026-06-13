import * as RadixAvatar from '@radix-ui/react-avatar';
import { avatarColor, initials } from '@/lib/avatar';
import { cn } from '@/lib/cn';

interface AvatarProps {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({
  id,
  name,
  email,
  image,
  size = 20,
  className,
}: AvatarProps) {
  const bg = avatarColor(id);
  const text = initials(name, email);
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full select-none shrink-0',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {image ? (
        <RadixAvatar.Image
          src={image}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : null}
      <RadixAvatar.Fallback
        className="flex h-full w-full items-center justify-center font-medium text-white"
        style={{ backgroundColor: bg, fontSize: Math.max(8, size * 0.42) }}
      >
        {text}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
