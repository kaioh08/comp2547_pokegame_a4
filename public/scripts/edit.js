$(document).ready(function () {
    $("body").on("click", "#submit", function () {
      var email = $("#email").val();
      var name = $("#name").val();
  
      $.ajax({
        url: `http://localhost:5003/edit/${name}/${email}`,
        method: "POST",
        success: () => {
          window.location.href = "/timeline";
        },
      });
    });
  });