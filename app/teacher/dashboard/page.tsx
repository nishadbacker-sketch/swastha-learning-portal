        </div>

        <div style={cardStyle}>
          <h2>Assign Learning Activity</h2>

          <form onSubmit={assignActivity}>
            <label htmlFor="select-student">
              Select student *
            </label>
            <select
              id="select-student"
              style={inputStyle}
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>

            <label htmlFor="select-activity">
              Select activity *
            </label>
            <select
              id="select-activity"
              style={inputStyle}
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              required
            >
              <option value="">Choose an activity</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>

            <label htmlFor="due-date">
              Due date (optional)
            </label>
            <input
              id="due-date"
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <button
              type="submit"
              style={buttonStyle}
              disabled={
                saving ||
                !selectedStudent ||
                !selectedActivity
              }
            >
              {saving ? "Assigning..." : "Assign Activity"}
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h2>My Learning Activities</h2>

          {activities.length === 0 ? (
            <p>No activities created yet.</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <strong>{activity.title}</strong>
                <p>{activity.description || "No description"}</p>
              </div>
            ))
          )}
        </div>

        <div style={cardStyle}>
          <h2>Activity Assignment History</h2>

          {assignments.length === 0 ? (
            <p>No activities assigned yet.</p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #dce8e1",
                }}
              >
                <h3>
                  {getActivityTitle(assignment.activity_id)}
                </h3>
                <p>
                  <strong>Student:</strong>{" "}
                  {getStudentName(assignment.student_id)}
                </p>
                <p>
                  <strong>Due date:</strong>{" "}
                  {formatDate(assignment.due_date)}
                </p>
                <p>
                  <strong>Status:</strong> {assignment.status}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
