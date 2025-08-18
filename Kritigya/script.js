document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if(email === "teacher@example.com" && password === "1234") {
    document.getElementById("message").innerText = "Welcome Teacher!";
  } else if(email === "student@example.com" && password === "1234") {
    document.getElementById("message").innerText = "Welcome Student!";
  } else {
    document.getElementById("message").innerText = "Invalid credentials.";
  }
});
