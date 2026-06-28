"use client";

import { useState } from "react";
import type { Person } from "@/types/game";
import PersonForm from "./PersonForm";

export default function PeoplePanel({
  people,
  selectedCharId,
  onAssign,
  onPeopleChange,
}: {
  people: Person[];
  selectedCharId: string | null;
  onAssign: (person: Person) => Promise<void>;
  onPeopleChange: (people: Person[]) => void;
}) {
  // null = closed, "new" = create form, uuid = edit form for that person
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const editingPerson =
    editingId && editingId !== "new"
      ? people.find((p) => p.id === editingId)
      : undefined;

  async function handleCardClick(person: Person) {
    if (selectedCharId) {
      setAssigning(person.id);
      try {
        await onAssign(person);
      } finally {
        setAssigning(null);
      }
    } else {
      setEditingId(editingId === person.id ? null : person.id);
    }
  }

  function handleSaved(saved: Person) {
    const exists = people.some((p) => p.id === saved.id);
    if (exists) {
      onPeopleChange(people.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      // New person created — add to list and switch to edit mode for photo upload
      onPeopleChange([...people, saved]);
      setEditingId(saved.id);
    }
  }

  function handleDeleted(personId: string) {
    onPeopleChange(people.filter((p) => p.id !== personId));
    setEditingId(null);
  }

  const hasSelection = selectedCharId !== null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">People</h3>
        <button
          onClick={() => setEditingId(editingId === "new" ? null : "new")}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          + Add
        </button>
      </div>

      {hasSelection && (
        <p className="text-xs text-indigo-400 mb-2">Click a person to assign →</p>
      )}

      {people.length === 0 && editingId === null ? (
        <p className="text-xs text-gray-600 text-center py-3">No people yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {people.map((person) => {
            const isAssigning = assigning === person.id;
            const isEditing = editingId === person.id;
            return (
              <button
                key={person.id}
                onClick={() => handleCardClick(person)}
                disabled={isAssigning}
                className={`relative group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                  isEditing
                    ? "bg-gray-700 border border-gray-600"
                    : hasSelection
                    ? "hover:bg-indigo-900/40 border border-transparent hover:border-indigo-700"
                    : "hover:bg-gray-800 border border-transparent"
                } disabled:opacity-50`}
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center shrink-0">
                  {person.referenceImageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.referenceImageUrls[0]}
                      alt={person.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 text-xl">👤</span>
                  )}
                  {hasSelection && !isAssigning && (
                    <div className="absolute inset-0 bg-indigo-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">Assign</span>
                    </div>
                  )}
                  {isAssigning && (
                    <div className="absolute inset-0 bg-indigo-900/80 flex items-center justify-center">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-300 truncate w-full text-center leading-tight">
                  {person.displayName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {editingId !== null && (
        <div className="mt-3">
          <PersonForm
            person={editingPerson}
            onSave={handleSaved}
            onDelete={editingPerson ? () => handleDeleted(editingPerson.id) : undefined}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  );
}
