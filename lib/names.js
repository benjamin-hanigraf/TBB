/** A student's name with the parent's name after it, for children: "Myra (C/o Neha Joshi)". Adults (or the same name) show as they are. */
export const withCo = (student, parent) => (student && parent && String(student).trim().toLowerCase() !== String(parent).trim().toLowerCase() ? `${student} (C/o ${parent})` : student || '');
