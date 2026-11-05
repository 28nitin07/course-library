# Welcome to Course Library

This is a starter guide, not material from an academic course.

## Browse the archive

Open folders in this order:

Department → Course → Semester → Professor → Course code → Files

The filters follow the same order. Changing a parent clears its child selections.
Search matches filenames and all five metadata fields within your current location.
Use Home to search everything. Open a filename to view it, or Download to save a copy.

## Add an offering

Create a folder such as:

courses/mathematics/linear-algebra/semester-1/professor-name/ma101/

Add your files and a course.json in that folder:

```json
{
  "department": "Mathematics",
  "course": "Linear Algebra",
  "semester": "Semester 1",
  "professor": "Professor name",
  "courseCode": "MA101",
  "description": "Lecture notes and problem sets."
}
```

Use a separate offering folder for each semester/professor/code combination.
You can add subfolders for lectures or assignments inside an offering.
Commit and push to GitHub; the site is rebuilt automatically.

Folder names are for storage. The course.json values determine the visible hierarchy.
Remove courses/library/ when this guide is no longer needed.
Only add materials you intend to make public and have permission to share.
