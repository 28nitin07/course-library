# Welcome to Course Library

This is a starter guide, not an academic course or an official university catalog.

## Find materials

1. Browse a department or search a course name, any cross-listed code, an instructor, or a filename.
2. Refine the directory by major, semester, and instructor. These filters work independently.
3. Open a course to compare its semester offerings and sections.
4. Choose an offering after checking all its instructors, then view or download its materials.

A cross-listed course has one home with multiple department codes. Parallel sections have separate offerings. Team-taught offerings list all instructors. Shared course materials are separate from semester-specific files.

## Add your courses through GitHub

The repository README contains complete examples for:

- Registering departments, majors, and semesters in catalog.config.json.
- Defining one canonical course with multiple department/code listings in course.json.
- Adding separate offering.json files for each semester and section.
- Listing several professors for team-taught offerings.
- Keeping shared files separate from offering files.

Use permanent IDs for courses, departments, majors, semesters, and instructors. Push changes to GitHub; the site rebuilds automatically. The build rejects invalid references rather than guessing academic relationships.

Remove courses/library-guide/ and its library department when you no longer need this guide. Only add materials you intend to make public and have permission to share.
