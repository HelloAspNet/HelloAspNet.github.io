<%@ WebHandler Language="C#" Class="Handler" Debug="true"%>

using System;
using System.Web;
using System.IO;

public class Handler : IHttpHandler {
    
    public void ProcessRequest (HttpContext context) {
        context.Response.ContentType = "text/plain";

		string currentPath = HttpContext.Current.Server.MapPath("../"); 
		
		string folderName = null, folderPath = null, fileName = null, filePath = null, fileContent = null, msg = "", debugMsg = "";
		bool state = true;
		
		string operation = null;
		
		
		//http://localhost/make.ashx?folder=test&operation=create
		
		try{
			folderName = context.Request["folder"];
			folderPath = currentPath + folderName;
			operation = context.Request["operation"];
		}
		catch {}
	
		switch(operation){
			case "delete":
				if (Directory.Exists(folderPath))
				{
					Directory.Delete(folderPath,true);
					msg = "folder delete success.";
					debugMsg += "folder delete success.";
				}
				else{
					msg = "folder not exists.";
					debugMsg += "folder not exists.";
				}
				break;
			case "open":
				if (Directory.Exists(folderPath))
				{
					System.Diagnostics.Process.Start("explorer.exe", folderPath);
					msg = "folder open success.";
					debugMsg += "folder open success.";
				}
				else{
					msg = "folder not exists.";
					debugMsg += "folder not exists.";
				}
				break;
			case "create":
			default:
				if (!Directory.Exists(folderPath))
				{
					Directory.CreateDirectory(folderPath);
					Directory.CreateDirectory(folderPath+"/image");
					msg = "folder create success.";
					debugMsg += "folder create success.";
				}
				else{
					msg = "folder exists.";
					debugMsg += "folder exists.";
				}
				break;
		}
			
		
		 
		
		try {
			fileName = context.Request["file"];
			filePath = folderPath + "\\" + fileName;
			if (File.Exists(filePath))
			{
				File.Delete(filePath);
				debugMsg += "file-exists and delete-success ";
			}
		}
		catch {
			debugMsg += "file-exists and delete-failure ";
		}
		
		try {
			fileContent = context.Request["content"]; 
			if(fileContent!=null){
				///创建文件信息对象
				FileInfo fi = new FileInfo(filePath);
				debugMsg += "file-create-success ";
				///以打开或者写入的形式创建文件流
				using (FileStream fs = fi.OpenWrite())
				{
					///根据上面创建的文件流创建写数据流
					StreamWriter sw = new StreamWriter(fs, System.Text.Encoding.GetEncoding("utf-8"));
					//StreamWriter sw = new StreamWriter(fs, System.Text.Encoding.GetEncoding("GB2312"));

					///把新的内容写到创建的HTML页面中
					sw.WriteLine(fileContent);
					sw.Flush();
					sw.Close();
					debugMsg += "file-wirte-success ";
				}
			}
			else{
				state = false;
				debugMsg += "file-wirte-failure ";
			}

		}
		catch {
			debugMsg += "file-wirte-failure "; 
		}
		
		context.Response.Write("{ \"state\" : " + Convert.ToString(state).ToLower() + ", \"msg\": \"" + msg + "..." + folderName + "..." + operation + "\", \"debugMsg\": \"" + debugMsg + "\"}");

    }
 
    public bool IsReusable {
        get {
            return false;
        }
    }

}