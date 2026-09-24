"use client";

/**
 * Role selector that submits its parent form as soon as the value changes.
 *
 * This must be a Client Component because `onChange` is an event handler, which
 * cannot be passed from a Server Component. The parent <form> still uses a
 * server action (`updateMemberRoleAction`), so no data logic moves to the client.
 */
export function RoleSelect({
  defaultValue,
  className,
}: {
  defaultValue: string;
  className?: string;
}) {
  return (
    <select
      name="role"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className}
      aria-label="Change member role"
    >
      <option value="SEEKER">Seeker</option>
      <option value="LINKER">Linker</option>
      <option value="BOTH">Both</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
