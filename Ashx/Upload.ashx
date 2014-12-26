<%@ WebHandler Language="C#" Class="Handler" Debug="true"%>

using System;
using System.Web;
using System.IO;

public class Handler : IHttpHandler {
    
    public void ProcessRequest (HttpContext context) {
        context.Response.ContentType = "text/plain";

		//string rootPath = HttpContext.Current.Server.MapPath("./"); 
		string rootPath = HttpContext.Current.Server.MapPath("../"); 
		
		HttpPostedFile file = context.Request.Files["file"];
		string url = context.Request["url"];
		int size = Convert.ToInt32(context.Request["size"]);
		
		int temp = 1024 * 1024 * 2;
		if(size> temp){
			size = temp;
		}
		
		string msg = "";
		string debugMsg = "";
		bool state = false;
	
		string fileName = file.FileName; 
		int bytes = file.ContentLength;
		if (bytes > size){
			msg = "overflow";
			state = false;
		}
		else{
			file.SaveAs(rootPath + url);
			state = true;
		}
			
		 
		context.Response.Write("{ \"state\" : " + Convert.ToString(state).ToLower() + ", \"msg\": \"" + rootPath + url + "\", \"debugMsg\": \"" + debugMsg + "\"}");

    }
 
    public bool IsReusable {
        get {
            return false;
        }
    }

}