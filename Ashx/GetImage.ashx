<%@ WebHandler Language="C#" Class="Handler" %>

using System;
using System.Web;
using System.IO; 
using System.Text;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;

public class Handler : IHttpHandler {
    
    public void ProcessRequest (HttpContext context) {
        context.Response.ContentType = "text/plain";
		
		string path = HttpContext.Current.Server.MapPath("../"); 
		
		string[] strArr = null;
		
		string list=null, folderName=null;
		
		try { 
			folderName = context.Request["folder"];
			path = path+folderName+"\\";
			strArr = System.IO.Directory.GetFileSystemEntries(path); 	
			for(int i=0;i<strArr.Length;i++){
				strArr[i] = strArr[i].Replace("\\\\","\\").Replace(path,"");
			}
			DataContractJsonSerializer serializer = new DataContractJsonSerializer(strArr.GetType());  
			using(MemoryStream ms=new MemoryStream())  
			{  
				serializer.WriteObject(ms, strArr);  
				StringBuilder sb = new StringBuilder();  
				sb.Append(Encoding.UTF8.GetString(ms.ToArray()));  
				list = sb.ToString();  
			}  
		}
		catch {
		
		}
		  
		/*
		//反序列化  
	  
		public static T FromJsonTo<T>(string jsonString)  
		{  
			DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(T));  
			using (MemoryStream ms = new MemoryStream(Encoding.UTF8.GetBytes(jsonString)))  
			{  
				T jsonObject = (T)ser.ReadObject(ms);  
				return jsonObject;  
			}  
		}  
		*/
		 
		if(list==null || list==""){
			list = "null";
		}
		context.Response.Write("{ \"state\" : true, \"msg\": \""+folderName+"\", \"list\": "+list+"}");

    }
 
    public bool IsReusable {
        get {
            return false;
        }
    }

}