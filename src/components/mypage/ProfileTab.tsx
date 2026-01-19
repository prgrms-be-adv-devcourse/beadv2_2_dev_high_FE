import { Divider, List, ListItem, ListItemText, Paper } from "@mui/material";
import type { User } from "../../types/user";

interface ProfileTabProps {
  userInfo: User | null;
  role?: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ userInfo, role }) => {
  return (
    <Paper>
      <List>
        <ListItem>
          <ListItemText
            primary="닉네임"
            secondary={userInfo?.nickname || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="이름"
            secondary={userInfo?.name || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="닉네임"
            secondary={userInfo?.nickname || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="번호"
            secondary={userInfo?.phone_number || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="이메일"
            secondary={userInfo?.email || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="주소"
            secondary={
              userInfo
                ? `${userInfo.city ?? ""} ${userInfo.state ?? ""} ${
                    userInfo.zip_code ?? ""
                  }`
                : "정보 없음"
            }
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="상세주소"
            secondary={userInfo?.detail ?? "-"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="역할" secondary={role || "정보 없음"} />
        </ListItem>
      </List>
    </Paper>
  );
};

