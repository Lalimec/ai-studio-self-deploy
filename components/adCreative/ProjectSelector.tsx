/**
 * ProjectSelector Component
 * Displays project cards for selection in Ad Creative Studio
 */

import React from 'react';
import { PlainlyProject } from '../../types';

interface ProjectSelectorProps {
  projects: PlainlyProject[];
  selectedProject: PlainlyProject | null;
  onSelectProject: (project: PlainlyProject) => void;
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
}: ProjectSelectorProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-main)]">
        Select a Project
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project)}
            className={`
              relative cursor-pointer rounded-xl p-6 transition-all duration-200
              ${selectedProject?.id === project.id
                ? 'bg-[var(--color-primary)] text-white shadow-lg scale-105'
                : 'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-muted)] hover:shadow-md'
              }
            `}
          >
            {/* Selected indicator */}
            {selectedProject?.id === project.id && (
              <div className="absolute top-3 right-3">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            )}

            {/* Project name */}
            <h3 className={`text-xl font-bold mb-3 ${selectedProject?.id === project.id ? 'text-white' : 'text-[var(--color-text-main)]'}`}>
              {project.name}
            </h3>

            {/* Template count */}
            <div className={`text-sm mb-3 ${selectedProject?.id === project.id ? 'text-white/90' : 'text-[var(--color-text-dim)]'}`}>
              {project.templates.length} Templates
            </div>

            {/* Templates */}
            <div className="flex flex-wrap gap-2 mb-3">
              {project.templates.map(template => (
                <span
                  key={template.id}
                  className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${selectedProject?.id === project.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--color-bg-muted)] text-[var(--color-text-dim)]'
                    }
                  `}
                >
                  {template.name}
                </span>
              ))}
            </div>

            {/* Parameter count */}
            <div className={`text-sm ${selectedProject?.id === project.id ? 'text-white/80' : 'text-[var(--color-text-light)]'}`}>
              {project.parameters.length} Parameters
            </div>
          </div>
        ))}
      </div>

      {selectedProject && (
        <div className="mt-8 p-4 bg-[var(--color-bg-surface)] rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-main)]">
            Selected: {selectedProject.name}
          </h3>
          <p className="text-sm text-[var(--color-text-dim)]">
            Template Name: <span className="font-mono text-[var(--color-text-main)]">{selectedProject.templateName}</span>
          </p>
        </div>
      )}
    </div>
  );
}
